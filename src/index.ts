import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { addDays, today } from './lib/dates.js';
import { SyncScheduler, type ScheduledSource } from './scheduler.js';
import { DemoSource } from './sources/demo.js';
import { GarminSource } from './sources/garmin.js';
import { MfpSource, parseMfpCsv } from './sources/myfitnesspal.js';
import { OuraSource } from './sources/oura.js';
import { Store } from './store.js';
import type { SourceAdapter } from './types.js';

const config = loadConfig();
const store = new Store(config.DATA_DIR);
await store.load();

const server = Fastify({ logger: { level: config.LOG_LEVEL } });

// Real adapters where credentials exist; demo data stands in for the rest when DEMO_MODE is on
// (or when nothing at all is configured, so a fresh checkout shows a working dashboard).
const real: Array<[SourceAdapter, number]> = [
  [new OuraSource(config, store), config.OURA_SYNC_MINUTES],
  [new GarminSource(config, store), config.GARMIN_SYNC_MINUTES],
  [new MfpSource(config), config.MFP_SYNC_MINUTES],
];
const noneConfigured = real.every(([a]) => !a.configured());
const useDemo = config.DEMO_MODE || noneConfigured;
const sources: ScheduledSource[] = real.map(([adapter, intervalMinutes]) =>
  adapter.configured() || !useDemo
    ? { adapter, intervalMinutes, demo: false }
    : { adapter: new DemoSource(adapter.id, adapter.label), intervalMinutes: 1, demo: true },
);

const scheduler = new SyncScheduler(sources, store, {
  backfillDays: config.BACKFILL_DAYS,
  resyncDays: config.RESYNC_DAYS,
  log: server.log,
});

// ── Auth ────────────────────────────────────────────────
if (config.DASHBOARD_PASSWORD) {
  const expected = Buffer.from(config.DASHBOARD_PASSWORD);
  server.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return;
    const header = request.headers.authorization ?? '';
    const given = header.startsWith('Basic ')
      ? Buffer.from(Buffer.from(header.slice(6), 'base64').toString().split(':').slice(1).join(':'))
      : Buffer.alloc(0);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return reply.header('WWW-Authenticate', 'Basic realm="dashboard"').status(401).send('Unauthorized');
    }
  });
} else {
  server.log.warn('DASHBOARD_PASSWORD is not set — the dashboard (and your health data) is public');
}

// ── Static UI ───────────────────────────────────────────
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
await server.register(fastifyStatic, { root: publicDir });

server.addContentTypeParser(['text/csv', 'text/plain'], { parseAs: 'string', bodyLimit: 20 * 1024 * 1024 }, (_req, body, done) =>
  done(null, body),
);

// ── API ─────────────────────────────────────────────────
server.get('/health', async () => ({ status: 'ok' }));

const RangeQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(90) });

server.get('/api/dashboard', async (request) => {
  const { days } = RangeQuery.parse(request.query);
  const end = today();
  const start = addDays(end, -(days - 1));
  return {
    generatedAt: new Date().toISOString(),
    range: { start, end },
    days: store.getDays(start, end),
    activities: store.getActivities(start),
    sources: scheduler.statuses(),
    goals: store.getGoals(),
  };
});

const GoalsBody = z.object({
  sleepMin: z.number().int().min(180).max(720),
  bedtimeMin: z.number().int().min(-360).max(240),
  steps: z.number().int().min(500).max(50000),
  protein: z.number().int().min(10).max(400),
  calories: z.number().int().min(800).max(6000),
  calorieTolerancePct: z.number().min(2).max(30),
  intensityWeekly: z.number().int().min(0).max(1500),
});

server.get('/api/goals', async () => store.getGoals());

server.put('/api/goals', async (request, reply) => {
  const parsed = GoalsBody.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid goals' });
  await store.setGoals(parsed.data);
  scheduler.emit('update', { source: 'goals' });
  return parsed.data;
});

const SyncBody = z.object({ source: z.enum(['oura', 'garmin', 'mfp']).optional() }).default({});

server.post('/api/sync', async (request) => {
  const { source } = SyncBody.parse(request.body ?? {});
  const ids = source ? [source] : sources.map((s) => s.adapter.id);
  return { started: ids.filter((id) => scheduler.syncNow(id)) };
});

server.post('/api/import/mfp', async (request, reply) => {
  if (typeof request.body !== 'string') {
    return reply.status(415).send({ error: 'Send the MyFitnessPal CSV export with Content-Type: text/csv' });
  }
  const days = parseMfpCsv(request.body);
  await store.putDays('mfp', days);
  scheduler.emit('update', { source: 'mfp' });
  return { imported: days.length };
});

// Server-sent events: the page refetches whenever a sync finishes, so it never needs reloading.
const clients = new Set<NodeJS.WritableStream>();
scheduler.on('update', (evt: { source: string }) => {
  const msg = `event: update\ndata: ${JSON.stringify(evt)}\n\n`;
  for (const c of clients) c.write(msg);
});

server.get('/api/stream', (request, reply) => {
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  request.raw.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
  });
});

const shutdown = async () => {
  scheduler.stop();
  await server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await server.listen({ port: config.PORT, host: config.HOST });
if (useDemo) server.log.info('Demo data is filling sources without credentials');
scheduler.start();

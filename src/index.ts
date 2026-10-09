import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { addDays, today } from './lib/dates.js';
import { PythonBridge } from './lib/python-bridge.js';
import { SyncScheduler, type ScheduledSource } from './scheduler.js';
import { DemoSource } from './sources/demo.js';
import { GarminSource } from './sources/garmin.js';
import { MfpSource, parseMfpCsv } from './sources/myfitnesspal.js';
import { OuraSource } from './sources/oura.js';
import { Store } from './store.js';

const config = loadConfig();
const store = new Store(config.DATA_DIR);
await store.load();

const server = Fastify({ logger: { level: config.LOG_LEVEL }, trustProxy: true });

// Health data must never sit on the open internet: refuse to start a deployed instance without a password.
if (process.env.NODE_ENV === 'production' && !config.DASHBOARD_PASSWORD) {
  server.log.fatal('DASHBOARD_PASSWORD must be set in production. Add it to your host\'s environment variables.');
  process.exit(1);
}

const bridge = new PythonBridge(undefined, (line) => server.log.debug({ connector: line }));
const oura = new OuraSource(config, store);
const garmin = new GarminSource(config, store, bridge);
const mfp = new MfpSource(config, store, bridge);
const sources: ScheduledSource[] = [
  { adapter: oura, demo: new DemoSource('oura', oura.label), intervalMinutes: config.OURA_SYNC_MINUTES },
  { adapter: garmin, demo: new DemoSource('garmin', garmin.label), intervalMinutes: config.GARMIN_SYNC_MINUTES },
  { adapter: mfp, demo: new DemoSource('mfp', mfp.label), intervalMinutes: config.MFP_SYNC_MINUTES },
];

const scheduler = new SyncScheduler(sources, store, {
  backfillDays: config.BACKFILL_DAYS,
  resyncDays: config.RESYNC_DAYS,
  demoMode: config.DEMO_MODE,
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
    experiments: store.getExperiments(),
  };
});

const GoalsBody = z.object({
  sleepMin: z.number().int().min(180).max(720),
  bedtimeMin: z.number().int().min(-360).max(240),
  steps: z.number().int().min(500).max(50000),
  protein: z.number().int().min(10).max(400),
  fiber: z.number().int().min(5).max(100),
  calories: z.number().int().min(800).max(6000),
  calorieTolerancePct: z.number().min(2).max(30),
  intensityWeekly: z.number().int().min(0).max(1500),
  daysPerWeek: z.number().int().min(1).max(7),
  showCalories: z.boolean(),
});

server.get('/api/goals', async () => store.getGoals());

const ExperimentBody = z.object({
  behaviourId: z.string().min(1).max(40),
  outcome: z.enum(['readiness', 'sleepScore', 'hrv']),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

server.post('/api/experiments', async (request, reply) => {
  const parsed = ExperimentBody.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid experiment' });
  const exp = { id: randomUUID(), ...parsed.data };
  await store.addExperiment(exp);
  scheduler.emit('update', { source: 'experiments' });
  return reply.status(201).send(exp);
});

server.delete<{ Params: { id: string } }>('/api/experiments/:id', async (request, reply) => {
  if (!(await store.removeExperiment(request.params.id))) return reply.status(404).send({ error: 'Experiment not found' });
  scheduler.emit('update', { source: 'experiments' });
  return reply.status(204).send();
});

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
  if (store.hasDemo('mfp')) await store.clearSource('mfp');
  await store.putDays('mfp', days);
  await store.setSecret('mfp.imported', true);
  scheduler.refreshAll();
  return { imported: days.length };
});

// ── Connections ──────────────────────────────────────────
// Credentials never come back out of these routes; only connection state does.

server.get('/api/connections', async () => ({
  oura: { connected: oura.connected(), canConnect: oura.canConnect(), viaEnv: !oura.connected() && oura.configured() },
  garmin: { connected: garmin.connected(), viaEnv: !garmin.connected() && garmin.configured() },
  mfp: { connected: mfp.configured(), username: mfp.username(), importedOnly: mfp.configured() && !mfp.username() },
}));

/** The address Oura sends people back to; must match the redirect URI registered on the Oura app. */
const ouraRedirect = (request: { protocol: string; headers: Record<string, unknown> }) =>
  `${config.PUBLIC_URL?.replace(/\/$/, '') ?? `${request.protocol}://${String(request.headers.host)}`}/auth/oura/callback`;
const ouraStates = new Map<string, number>();

server.get('/auth/oura/start', async (request, reply) => {
  if (!oura.canConnect()) {
    return reply.status(400).type('text/plain').send('Set OURA_CLIENT_ID and OURA_CLIENT_SECRET on your host first (see the README).');
  }
  const state = randomBytes(16).toString('hex');
  ouraStates.set(state, Date.now() + 10 * 60_000);
  return reply.redirect(oura.authorizeUrl(ouraRedirect(request), state));
});

server.get<{ Querystring: { code?: string; state?: string; error?: string } }>('/auth/oura/callback', async (request, reply) => {
  const { code, state, error } = request.query;
  const valid = state && (ouraStates.get(state) ?? 0) > Date.now();
  if (state) ouraStates.delete(state);
  if (error || !code || !valid) return reply.redirect(`/?connect=oura-failed#today`);
  try {
    await oura.exchangeCode(code, ouraRedirect(request));
  } catch (err) {
    request.log.warn({ err: (err as Error).message }, 'oura connect failed');
    return reply.redirect(`/?connect=oura-failed#today`);
  }
  scheduler.refreshAll();
  return reply.redirect(`/?connect=oura#today`);
});

const GarminLogin = z.object({ email: z.string().email(), password: z.string().min(1) });
server.post('/api/connect/garmin', async (request, reply) => {
  const body = GarminLogin.safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: 'Enter your Garmin email and password' });
  try {
    const status = await garmin.login(body.data.email, body.data.password);
    if (status === 'ok') scheduler.refreshAll();
    return { status };
  } catch (err) {
    return reply.status(400).send({ error: `Garmin sign-in failed: ${(err as Error).message}` });
  }
});

server.post('/api/connect/garmin/code', async (request, reply) => {
  const body = z.object({ code: z.string().min(4).max(12) }).safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: 'Enter the code Garmin sent you' });
  try {
    await garmin.verify(body.data.code);
    scheduler.refreshAll();
    return { status: 'ok' };
  } catch (err) {
    return reply.status(400).send({ error: `That code didn't work: ${(err as Error).message}` });
  }
});

const MfpConnect = z.object({ username: z.string().min(1).max(100), cookie: z.string().max(20_000).optional() });
server.post('/api/connect/mfp', async (request, reply) => {
  const body = MfpConnect.safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: 'Enter your MyFitnessPal username' });
  try {
    const todayTotals = await mfp.connect(body.data.username.trim(), body.data.cookie?.trim() || undefined);
    scheduler.refreshAll();
    return { status: 'ok', today: todayTotals };
  } catch (err) {
    return reply.status(400).send({ error: (err as Error).message });
  }
});

server.delete<{ Params: { source: string } }>('/api/connect/:source', async (request, reply) => {
  const target = { oura, garmin, mfp }[request.params.source as 'oura' | 'garmin' | 'mfp'];
  if (!target) return reply.status(404).send({ error: 'Unknown source' });
  await target.disconnect();
  scheduler.refreshAll();
  return reply.status(204).send();
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
  bridge.stop();
  await server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await server.listen({ port: config.PORT, host: config.HOST });
scheduler.start();

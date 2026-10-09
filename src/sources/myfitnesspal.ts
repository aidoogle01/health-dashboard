import type { Config } from '../config.js';
import { dateRange } from '../lib/dates.js';
import type { PythonBridge } from '../lib/python-bridge.js';
import type { Store } from '../store.js';
import type { MfpDay, SourceAdapter, SyncResult } from '../types.js';

/**
 * MyFitnessPal has no public API. This reads the food diary page the website
 * renders for a signed-in user (or for anyone, if the diary is public), using
 * the session cookie copied from a logged-in browser. Pages are fetched through
 * the Python connector helper, which presents a browser TLS fingerprint because
 * MyFitnessPal blocks ordinary server clients. For bulk history, or if the site
 * blocks your host, the CSV export can be imported instead (see parseMfpCsv).
 */

const EXPIRED = 'MyFitnessPal sign-in expired or the diary is private. Paste a fresh cookie in the Connections panel';

const COLUMN_MAP: Record<string, keyof MfpDay> = {
  calories: 'calories',
  carbs: 'carbs',
  carbohydrates: 'carbs',
  fat: 'fat',
  protein: 'protein',
  fiber: 'fiber',
  sugar: 'sugar',
  sugars: 'sugar',
  sodium: 'sodium',
};

const stripTags = (html: string) =>
  html
    .replace(/<div class="subtitle">[\s\S]*?<\/div>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cells = (rowHtml: string) => [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1] ?? '');

const firstNumber = (cellHtml: string) => {
  const m = stripTags(cellHtml).match(/-?[\d,]+(\.\d+)?/);
  return m ? Number(m[0].replace(/,/g, '')) : undefined;
};

function rowByClass(html: string, cls: string): string | undefined {
  const re = new RegExp(`<tr[^>]*class="${cls}"[^>]*>([\\s\\S]*?)</tr>`);
  return html.match(re)?.[1];
}

export class MfpSessionError extends Error {}

/** Parse totals and daily goal from a diary page. Exported for tests. */
export function parseMfpDiary(html: string): MfpDay {
  if (/<form[^>]+(id="fitnessLogin"|action="[^"]*\/account\/login)/.test(html) || /id="loginForm"/.test(html)) {
    throw new MfpSessionError(EXPIRED);
  }
  const header = html.match(/<tfoot>([\s\S]*?)<\/tfoot>/)?.[1] ?? rowByClass(html, 'meal_header') ?? '';
  const columns = cells(header)
    .slice(1)
    .map((c) => COLUMN_MAP[stripTags(c).toLowerCase()]);

  const read = (rowHtml: string | undefined) => {
    const out: MfpDay = {};
    if (!rowHtml) return out;
    cells(rowHtml)
      .slice(1)
      .forEach((c, i) => {
        const key = columns[i];
        if (key) out[key] = firstNumber(c);
      });
    return out;
  };

  const totals = read(rowByClass(html, 'total'));
  const goal = read(rowByClass(html, 'total alt'));
  return { ...totals, goalCalories: goal.calories };
}

/** Split one CSV line, honouring quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++;
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') out.push(cur), (cur = '');
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Parse MyFitnessPal's "Nutrition Summary" CSV export (one row per meal) into
 * daily totals. Exported for tests.
 */
export function parseMfpCsv(csv: string): SyncResult['days'] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const [headerLine, ...rows] = lines;
  if (!headerLine) return [];
  const header = splitCsvLine(headerLine).map((h) => h.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase());
  const dateIdx = header.indexOf('date');
  if (dateIdx < 0) throw new Error('CSV has no Date column — is this a MyFitnessPal nutrition export?');

  const totals = new Map<string, MfpDay>();
  for (const row of rows) {
    const fields = splitCsvLine(row);
    const date = fields[dateIdx]?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const day = totals.get(date) ?? {};
    header.forEach((h, i) => {
      const key = COLUMN_MAP[h];
      const v = Number(fields[i]);
      if (key && Number.isFinite(v)) day[key] = (day[key] ?? 0) + v;
    });
    totals.set(date, day);
  }
  return [...totals].map(([date, data]) => ({ date, data: { ...data } }));
}

const ACCOUNT = 'mfp.account';

interface MfpAccount {
  username: string;
  cookie?: string | undefined;
}

export class MfpSource implements SourceAdapter {
  readonly id = 'mfp' as const;
  readonly label = 'MyFitnessPal';

  constructor(
    private readonly config: Config,
    private readonly store: Store,
    private readonly bridge: PythonBridge,
  ) {}

  private account(): MfpAccount | undefined {
    const saved = this.store.getSecret<MfpAccount>(ACCOUNT);
    if (saved?.username) return saved;
    return this.config.MFP_USERNAME ? { username: this.config.MFP_USERNAME, cookie: this.config.MFP_COOKIE } : undefined;
  }

  /** Connected with an account, or holding history imported from a CSV export. */
  configured(): boolean {
    return Boolean(this.account() || this.store.getSecret<boolean>('mfp.imported'));
  }

  username(): string | undefined {
    return this.account()?.username;
  }

  /** Save an account after checking that today's diary can actually be read with it. */
  async connect(username: string, cookie: string | undefined): Promise<MfpDay> {
    const date = new Date().toISOString().slice(0, 10);
    const [day] = await this.fetchDays({ username, cookie }, [date]);
    await this.store.setSecret(ACCOUNT, { username, cookie });
    return day?.data ?? {};
  }

  async disconnect(): Promise<void> {
    await this.store.setSecret(ACCOUNT, undefined);
    await this.store.setSecret('mfp.imported', undefined);
  }

  private async fetchDays(account: MfpAccount, dates: string[]): Promise<Array<{ date: string; data: MfpDay }>> {
    const res = await this.bridge.call<{ pages: Array<{ date: string; status: number; url: string; html: string }> }>(
      'mfp.fetch',
      { username: account.username, cookie: account.cookie, dates },
      300_000,
    );
    return res.pages.map((p) => {
      if (/\/account\/login|\/login\b/.test(p.url) || p.status === 401) throw new MfpSessionError(EXPIRED);
      if (p.status === 403 || /cf-chl|challenge-platform/.test(p.html)) {
        throw new Error('MyFitnessPal blocked the request from this server. Import your CSV export instead, or try again later');
      }
      if (p.status >= 400) throw new Error(`MyFitnessPal diary request failed (${p.status})`);
      return { date: p.date, data: parseMfpDiary(p.html) };
    });
  }

  async sync(start: string, end: string): Promise<SyncResult> {
    const account = this.account();
    if (!account) return { days: [] }; // CSV-imported history only; nothing to fetch
    const days = await this.fetchDays(account, dateRange(start, end));
    return { days: days.map((d) => ({ date: d.date, data: { ...d.data } })) };
  }
}

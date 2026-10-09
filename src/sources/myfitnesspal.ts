import type { Config } from '../config.js';
import { dateRange } from '../lib/dates.js';
import type { MfpDay, SourceAdapter, SyncResult } from '../types.js';

/**
 * MyFitnessPal has no public API. This reads the food diary page the website
 * renders for a signed-in user (or for anyone, if the diary is public), using
 * the session cookie copied from a logged-in browser. For bulk history, the
 * CSV export can be imported instead (see parseMfpCsv).
 */

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
    throw new MfpSessionError('MyFitnessPal session expired or diary is private — refresh MFP_COOKIE');
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

export class MfpSource implements SourceAdapter {
  readonly id = 'mfp' as const;
  readonly label = 'MyFitnessPal';

  constructor(private readonly config: Config) {}

  configured(): boolean {
    return Boolean(this.config.MFP_USERNAME);
  }

  async sync(start: string, end: string): Promise<SyncResult> {
    const user = encodeURIComponent(this.config.MFP_USERNAME ?? '');
    const days: SyncResult['days'] = [];
    for (const date of dateRange(start, end)) {
      const res = await fetch(`https://www.myfitnesspal.com/food/diary/${user}?date=${date}`, {
        headers: {
          ...(this.config.MFP_COOKIE ? { Cookie: this.config.MFP_COOKIE } : {}),
          'User-Agent': 'Mozilla/5.0 (compatible; meals.AI dashboard)',
          Accept: 'text/html',
        },
        redirect: 'follow',
      });
      if (/\/account\/login/.test(res.url)) {
        throw new MfpSessionError('MyFitnessPal session expired or diary is private — refresh MFP_COOKIE');
      }
      if (!res.ok) throw new Error(`MyFitnessPal diary request failed (${res.status})`);
      days.push({ date, data: { ...parseMfpDiary(await res.text()) } });
    }
    return { days };
  }
}

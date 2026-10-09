/** Date helpers working in YYYY-MM-DD strings, in the server's local time zone. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function today(): string {
  return toISODate(new Date());
}

/** Inclusive list of dates from start to end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * Minutes from midnight of the wake day for a local clock time "HH:MM".
 * Times from noon onwards belong to the evening before (23:30 → -30).
 */
export function clockMinutes(hours: number, minutes: number, isBedtime: boolean): number {
  const m = hours * 60 + minutes;
  return isBedtime && hours >= 12 ? m - 1440 : m;
}

/** Clock minutes from an ISO timestamp, read in the timestamp's own offset (the wearer's local time). */
export function clockFromIso(iso: string | null | undefined, isBedtime: boolean): number | undefined {
  const m = iso?.match(/T(\d{2}):(\d{2})/);
  return m ? clockMinutes(Number(m[1]), Number(m[2]), isBedtime) : undefined;
}

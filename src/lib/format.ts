/** Formatting helpers. Dates are stored as YYYY-MM-DD strings. */

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function money(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—';
  const v = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(v)) return '—';
  return '₹' + inr.format(v);
}

export function today(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + days));
}

export function addYears(iso: string, years: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y + years, m - 1, d));
}

/** Whole days from today until the given date (negative = in the past). */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - base) / 86400000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

/** Accepts DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, or an Excel serial number. Returns YYYY-MM-DD or null. */
export function parseDate(input: unknown): string | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date && !Number.isNaN(input.getTime())) return toISO(input);
  if (typeof input === 'number') {
    // Excel serial date (days since 1899-12-30)
    const ms = Math.round((input - 25569) * 86400000);
    const d = new Date(ms);
    return toISO(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const s = String(input).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return valid(y, +m[2], +m[1]);
  }
  m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -](\d{2,4})$/);
  if (m) {
    const mon = MONTHS.findIndex((x) => x.toLowerCase() === m![2].toLowerCase()) + 1;
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (mon) return valid(y, mon, +m[1]);
  }
  return null;
}

function valid(y: number, m: number, d: number): string | null {
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return toISO(dt);
}

export function toNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const v = Number(String(input).replace(/[₹,\s]/g, ''));
  return Number.isFinite(v) ? v : null;
}

export function blankToNull(s: string | null | undefined): string | null {
  const t = (s ?? '').trim();
  return t === '' ? null : t;
}

const pad = (n) => String(n).padStart(2, '0');

/** "2026-11" for the month of a date. */
export const periodOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** First day of the month `delta` months away. */
export const shiftMonth = (d, delta) =>
  new Date(d.getFullYear(), d.getMonth() + delta, 1);

/** The month a "YYYY-MM" string names, or the current month. */
export function monthFromPeriod(period) {
  const match = /^(\d{4})-(\d{2})$/.exec(period || '');
  const now = new Date();
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
}

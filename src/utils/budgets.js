import { intlLocale } from './dateLocale';

export const PERIOD_TYPES = ['weekly', 'monthly', 'quarterly'];

const parse = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "1 – 31 mar" or "28 feb – 30 mar 2027" for a budget period. */
export function periodRange({ start, end }) {
  const from = parse(start);
  const to = parse(end);
  const sameYear = from.getFullYear() === to.getFullYear();
  const thisYear = to.getFullYear() === new Date().getFullYear();
  const fmt = (d, withYear) =>
    d.toLocaleDateString(intlLocale(), {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
    });
  return `${fmt(from, !sameYear)} – ${fmt(to, !thisYear || !sameYear)}`;
}

/** Days left in the period, today included. */
export function daysLeft({ end }, today = new Date()) {
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.max(0, Math.round((parse(end) - start) / 86400000) + 1);
}

/**
 * Meter color: the budget's own color until 30% is left, amber up to 10%
 * left, rose from there or when over.
 */
export function meterColor(budget, fallback = '#059669') {
  if (budget.available <= 0) return budget.spent > 0 ? '#e11d48' : fallback;
  const left = 1 - budget.spent / budget.available;
  if (left <= 0.1) return '#e11d48';
  if (left <= 0.3) return '#d97706';
  return fallback;
}

/** The color a budget shows: its first category or tag, else emerald. */
export const budgetColor = (budget) =>
  budget.categories?.[0]?.color || budget.tags?.[0]?.color || '#059669';

import { ALL_CURRENCIES } from '../../context/CurrencyContext';
import { intlLocale } from '../../utils/dateLocale';

// Formatting helpers for the investments module. Amounts here can be in any
// currency (the asset's or the user's), so they take an explicit code instead
// of the app-wide currency from CurrencyContext.

const SYMBOLS = new Map(ALL_CURRENCIES.map((c) => [c.code, c.symbol]));

/** Display symbol for any currency code (falls back to the code itself). */
const currencySymbol = (code) => SYMBOLS.get(code) || (code ? `${code} ` : '');

const numberFormat = (min, max) =>
  new Intl.NumberFormat(intlLocale(), {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

/** "RD$6,000.00" — symbol of `code` + grouped amount. */
export function formatMoney(
  value,
  code,
  { decimals = 2, fallback = '—' } = {},
) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return fallback;
  const sign = n < 0 ? '-' : '';
  return `${sign}${currencySymbol(code)}${numberFormat(decimals, decimals).format(Math.abs(n))}`;
}

/** Same as formatMoney but always shows the sign: "+RD$510.00" / "-US$3.20". */
export function formatSignedMoney(value, code, opts) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return opts?.fallback ?? '—';
  return (n > 0 ? '+' : '') + formatMoney(n, code, opts);
}

/** Fractional shares: up to 4 decimals for display (stored with 8). */
export function formatShares(value, fallback = '—') {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return fallback;
  return numberFormat(0, 4).format(n);
}

/** "+1.23%" */
export function formatPercent(value, fallback = '—') {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return fallback;
  return `${n > 0 ? '+' : ''}${numberFormat(2, 2).format(n)}%`;
}

/** DATEONLY 'YYYY-MM-DD' → localized date, without timezone shifts. */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(intlLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** "hace 3 min" / "3 min ago" relative to now. */
export function formatRelative(date) {
  if (!date) return null;
  const diffSec = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86400), 'day');
}

/** Tailwind classes for gain (green) / loss (red) / flat. */
export function gainClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'text-gray-500 dark:text-gray-400';
  return n > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

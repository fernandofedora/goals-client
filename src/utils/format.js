export function formatAmount(value, { currencySymbol = '$', fallback = '—' } = {}) {
  const n = Number(value);
  if (Number.isFinite(n)) return `${currencySymbol}${n.toFixed(2)}`;
  return fallback;
}
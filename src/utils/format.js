import { isPrivacyOn, PRIVACY_MASK } from './privacy';

/** Axis-friendly short number: 950 → "950", 1500 → "1.5k", 2000 → "2k", 1.2e6 → "1.2M". */
export function compactNumber(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const short = (x) => String(Number(x.toFixed(1)));
  if (abs >= 1e6) return `${short(n / 1e6)}M`;
  if (abs >= 1e3) return `${short(n / 1e3)}k`;
  return String(Number(n.toFixed(2)));
}

export function formatAmount(
  value,
  { currencySymbol = '$', fallback = '—' } = {},
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (isPrivacyOn()) return PRIVACY_MASK;
  return `${currencySymbol}${n.toFixed(2)}`;
}

/**
 * Privacy mode flag shared by the pure formatters (utils/format.js,
 * components/investments/format.js). CurrencyProvider owns the React state and
 * the per-user persistence; it mirrors the value here synchronously so helpers
 * that are not hooks mask amounts on the same render.
 */

export const PRIVACY_MASK = '•••••';

let enabled = false;

export const isPrivacyOn = () => enabled;

export function setPrivacyFlag(value) {
  enabled = Boolean(value);
}

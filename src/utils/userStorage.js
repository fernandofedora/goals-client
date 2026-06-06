/**
 * Per-user, versioned localStorage for UI preferences.
 *
 * Why: preferences used to live under browser-global keys (e.g. 'currency'),
 * so two users on the same browser shared the same slot — one user's choice
 * leaked into another's session. Namespacing every preference by the current
 * user's stable id (publicId) isolates them: each account keeps its own prefs,
 * and switching users can never bleed values across accounts.
 *
 * Follows the `client-localstorage-schema` rule: version the keys, store only
 * what the UI needs, and wrap every access in try/catch (localStorage throws in
 * private mode, when quota is exceeded, or when disabled).
 *
 * Auth artifacts (`token`, `user`) stay global on purpose — they ARE the
 * identity used to resolve the namespace, so they must not be scoped.
 */

const PREFIX = 'pref:v1';
const ANON = 'anon';

/** Stable id of the currently authenticated user, or 'anon' when logged out. */
export function currentUserId() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.publicId || ANON;
  } catch {
    return ANON;
  }
}

function scopedKey(key, userId = currentUserId()) {
  return `${PREFIX}:${userId}:${key}`;
}

/** Read a string preference for the current user (or `fallback` if absent). */
export function getPref(key, fallback = null) {
  try {
    const raw = localStorage.getItem(scopedKey(key));
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

/** Write a string preference for the current user. */
export function setPref(key, value) {
  try {
    localStorage.setItem(scopedKey(key), String(value));
  } catch {
    /* private mode / quota / disabled — the preference just won't persist */
  }
}

/** Remove a preference for the current user. */
export function removePref(key) {
  try {
    localStorage.removeItem(scopedKey(key));
  } catch {
    /* nothing else to do */
  }
}

/** Read a JSON preference for the current user (or `fallback` if absent/invalid). */
export function getPrefJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(scopedKey(key));
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Write a JSON preference for the current user. */
export function setPrefJSON(key, value) {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(value));
  } catch {
    /* private mode / quota / disabled */
  }
}

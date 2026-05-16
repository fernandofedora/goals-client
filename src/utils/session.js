// Routes that are themselves part of the auth flow: never bounce these.
const AUTH_PATHS = ['/login', '/register', '/reset-password', '/verify-email'];

// Treat the token as expired only this many seconds past `exp`, to absorb
// minor client/server clock skew. The server stays the source of truth, so a
// little extra leeway here only avoids logging out still-valid sessions.
const CLOCK_SKEW_LEEWAY_SEC = 60;

// One-shot flag, read by the Login page after the hard redirect so the
// "sesión expirada" message survives the full page reload.
const EXPIRED_NOTICE_KEY = 'sessionExpiredNotice';

// Single-flight guard: the dashboard fires several requests at once, so a
// stale session produces a burst of 401s. Only the first one should redirect.
let loggingOut = false;

/** Remove every auth artifact from storage. */
export function clearSession() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    /* localStorage can be unavailable (private mode); nothing else to do */
  }
}

/** Base64url-decode a JWT segment without throwing. */
function decodeSegment(segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

/**
 * UX-only expiry check. The server still verifies the signature on every
 * request — this just lets the client redirect early instead of rendering a
 * screen that will immediately fail. Fails closed: a missing, malformed or
 * unparseable token counts as expired.
 */
export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const { exp } = JSON.parse(decodeSegment(parts[1]));
    if (typeof exp !== 'number') return true;
    return Date.now() / 1000 > exp + CLOCK_SKEW_LEEWAY_SEC;
  } catch {
    return true;
  }
}

function onAuthPath() {
  return AUTH_PATHS.some((p) => window.location.pathname.startsWith(p));
}

/** Consume (and clear) the one-shot expired-session notice flag. */
export function consumeExpiredNotice() {
  try {
    if (sessionStorage.getItem(EXPIRED_NOTICE_KEY)) {
      sessionStorage.removeItem(EXPIRED_NOTICE_KEY);
      return true;
    }
  } catch {
    /* sessionStorage unavailable */
  }
  return false;
}

/**
 * Wipe the session and send the user back to login.
 *
 * Security notes:
 *  - Always clears BOTH `token` and `user` so no stale identity remains.
 *  - Uses a hard `location.replace` (not React Router): this drops all
 *    in-memory state that may hold financial data, and `replace` keeps the
 *    dead page out of history so Back can't return to it.
 *  - Single-flight + auth-path guard prevent redirect loops and toast spam.
 */
export function forceLogout() {
  if (loggingOut) return;
  loggingOut = true;

  clearSession();

  if (typeof window === 'undefined' || onAuthPath()) return;

  try {
    sessionStorage.setItem(EXPIRED_NOTICE_KEY, '1');
  } catch {
    /* sessionStorage unavailable; the redirect still happens */
  }

  window.location.replace('/login');
}

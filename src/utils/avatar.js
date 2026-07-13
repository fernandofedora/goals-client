/**
 * Canonical avatar identity helpers.
 *
 * The color a user sees on their navbar avatar IS their identity color across
 * the app (profile hero, admin lists). Navbar, UserManager and Profile used to
 * each ship their own palette/hash, so the same person could be amber in the
 * navbar and purple in their profile. This module is the single source of
 * truth: same palette, same hash, same initials everywhere.
 */

// Palette taken from the original Navbar avatar — the one users already
// associate with their account.
export const AVATAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
];

/** Deterministic color for a user name (same hash the navbar always used). */
export function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

/** Up to two uppercase initials, e.g. "Paola Y Noel" → "PY". */
export function userInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

import api from '../api';
import { getPrefJSON, removePref } from './userStorage';

const PATHS = { card: '/cards', bank: '/accounts' };
const LEGACY_KEYS = {
  card: 'accounts.hiddenCardIds',
  bank: 'accounts.hiddenBankIds',
};

/** Removes an account from (or returns it to) the Accounts list; its data stays. */
export const setAccountHidden = (kind, id, isHidden) =>
  api.patch(`${PATHS[kind]}/${id}/visibility`, { isHidden });

/**
 * One-time migration: items hidden before isHidden existed lived only in this
 * browser. Marks them on the server and in the given lists, then drops the
 * prefs; if a request fails the prefs stay so it retries on the next load.
 */
export async function migrateLocalHidden(cards, accounts) {
  const pending = [
    ['card', cards],
    ['bank', accounts],
  ].flatMap(([kind, items]) => {
    const ids = getPrefJSON(LEGACY_KEYS[kind], []);
    return items
      .filter((item) => ids.includes(item.id) && !item.isHidden)
      .map((item) => ({ kind, item }));
  });
  const hadPrefs =
    getPrefJSON(LEGACY_KEYS.card, []).length > 0 ||
    getPrefJSON(LEGACY_KEYS.bank, []).length > 0;
  if (!hadPrefs) return;

  try {
    await Promise.all(
      pending.map(({ kind, item }) => setAccountHidden(kind, item.id, true)),
    );
    pending.forEach(({ item }) => {
      item.isHidden = true;
    });
    removePref(LEGACY_KEYS.card);
    removePref(LEGACY_KEYS.bank);
  } catch {
    /* prefs kept: the migration runs again on the next load */
  }
}

import { useCallback, useState } from 'react';
import { getPrefJSON, setPrefJSON } from '../utils/userStorage';

const KEYS = {
  card: 'accounts.hiddenCardIds',
  bank: 'accounts.hiddenBankIds',
};

/**
 * Accounts and cards the user removed from the Accounts list. Their data stays;
 * deleting for real only happens in Settings.
 */
export default function useHiddenAccounts() {
  const [hidden, setHidden] = useState(() => ({
    card: getPrefJSON(KEYS.card, []),
    bank: getPrefJSON(KEYS.bank, []),
  }));

  const update = useCallback((kind, change) => {
    setHidden((prev) => {
      const ids = change(prev[kind]);
      setPrefJSON(KEYS[kind], ids);
      return { ...prev, [kind]: ids };
    });
  }, []);

  const hide = useCallback(
    (kind, id) => update(kind, (ids) => [...ids, id]),
    [update],
  );
  const restore = useCallback(
    (kind, id) => update(kind, (ids) => ids.filter((x) => x !== id)),
    [update],
  );
  const isHidden = useCallback(
    (kind, id) => hidden[kind].includes(id),
    [hidden],
  );

  return { hide, restore, isHidden };
}

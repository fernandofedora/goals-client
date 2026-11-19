import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../api';
import { onTransactionsChanged } from '../utils/transactionEvents';

const THRESHOLD = 80;

/** Dashboard notice for cards using 80% or more of their credit limit. */
export default function CardLimitAlert() {
  const { t } = useTranslation();
  const [cards, setCards] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => onTransactionsChanged(() => setTick((n) => n + 1)), []);
  useEffect(() => {
    let alive = true;
    Promise.all([api.get('/cards/status'), api.get('/cards')])
      .then(([status, list]) => {
        if (!alive) return;
        const names = new Map(list.data.map((c) => [c.id, c.name]));
        setCards(
          status.data
            .filter((s) => s.usedPercent != null && s.usedPercent >= THRESHOLD)
            .map((s) => ({ ...s, name: names.get(s.cardId) })),
        );
      })
      // Without the data there is simply no notice.
      .catch(() => alive && setCards([]));
    return () => {
      alive = false;
    };
  }, [tick]);

  if (!cards.length) return null;
  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-1"
    >
      {cards.map((c) => (
        <p
          key={c.cardId}
          className="text-sm text-amber-900 dark:text-amber-200"
        >
          {t('cardCredit.alert', {
            name: c.name,
            pct: Math.round(c.usedPercent),
          })}{' '}
          <Link
            to={`/plans/accounts/card/${c.cardId}`}
            className="font-semibold underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {t('cardCredit.seeCard')}
          </Link>
        </p>
      ))}
    </div>
  );
}

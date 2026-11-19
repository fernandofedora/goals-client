import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { onTransactionsChanged } from '../utils/transactionEvents';

/** Spending per tag over the last 30 days; hidden while no tag has spending. */
export default function TopTagsCard() {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const [items, setItems] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => onTransactionsChanged(() => setTick((n) => n + 1)), []);
  useEffect(() => {
    let alive = true;
    api
      .get('/stats/top-tags', { params: { days: 30 } })
      .then((res) => alive && setItems(res.data.items))
      // Without data the card simply stays out of the Dashboard.
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [tick]);

  if (!items?.length) return null;
  const top = items[0].amount;
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
      <h3 className="text-base font-semibold text-[var(--foreground)]">
        {t('tags.topTitle')}
      </h3>
      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
        {t('tags.topSubtitle')}
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((tag) => (
          <li key={tag.tagId}>
            <Link
              to={`/transactions/add?tagId=${tag.tagId}`}
              className="block rounded-md cursor-pointer hover:bg-[var(--muted)] -mx-2 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full flex-shrink-0"
                    style={{ background: tag.color }}
                  />
                  <span className="truncate text-[var(--foreground)]">
                    {tag.name}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {t('tags.movements', { count: tag.count })}
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-[var(--foreground)]">
                  {money(tag.amount)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(tag.amount / top) * 100}%`,
                    background: tag.color,
                  }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

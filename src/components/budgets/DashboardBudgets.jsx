import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../api';
import BudgetRow from './BudgetRow';

/** Read-only list of the flexible budgets, each in its running period. */
export default function DashboardBudgets({ refreshKey }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    api
      .get('/spending-budgets')
      .then((res) => {
        if (!alive) return;
        setItems(res.data);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  if (status === 'loading')
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-[var(--muted)] animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  if (status === 'error')
    return (
      <p className="text-sm text-rose-700 dark:text-rose-400">
        {t('budgets.loadFailed')}
      </p>
    );
  if (!items.length)
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t('budgets.emptyTitle')}
        </p>
        <Link
          to="/transactions/budget"
          className="inline-flex items-center min-h-11 sm:min-h-0 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {t('budgets.createFirst')}
        </Link>
      </div>
    );
  return (
    <ul className="-mx-5 divide-y divide-[var(--border)]">
      {items.map((budget) => (
        <li key={budget.id}>
          <BudgetRow budget={budget} />
        </li>
      ))}
    </ul>
  );
}

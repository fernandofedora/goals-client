import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../api';
import MonthStepper from './ui/month-stepper';
import { useCurrency } from '../context/CurrencyContext';
import { periodOf } from '../utils/months';
import { cn } from '../lib/utils';

// Same thresholds as the dashboard's category budgets: amber with 30% left,
// rose with 10% left or over.
function meterColor(spent, budget, color) {
  if (!budget) return color;
  const left = 1 - spent / budget;
  if (left <= 0.1) return '#e11d48';
  if (left <= 0.3) return '#d97706';
  return color;
}

function BudgetRow({ item, period, child }) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const budget = item.budget;
  const pct = budget ? Math.round((item.spent / budget) * 100) : 0;
  const left = budget != null ? budget - item.spent : null;
  return (
    <Link
      to={`/transactions/budget/${item.id}?period=${period}`}
      className={cn(
        'block py-3 pr-5 rounded-md cursor-pointer hover:bg-[var(--muted)] active:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]',
        child ? 'pl-10 sm:pl-12' : 'pl-5',
      )}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'rounded-full flex-shrink-0',
              child ? 'size-2' : 'size-2.5',
            )}
            style={{ background: item.color }}
          />
          <span
            className={cn(
              'truncate text-[var(--foreground)]',
              !child && 'font-medium',
            )}
          >
            {item.name}
          </span>
        </span>
        <span className="flex-shrink-0 tabular-nums text-[var(--muted-foreground)]">
          {money(item.spent)}
          {budget != null && <> / {money(budget)}</>}
        </span>
      </div>
      {budget != null && (
        <>
          <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: meterColor(item.spent, budget, item.color),
              }}
            />
          </div>
          <p
            className={cn(
              'mt-1 text-xs tabular-nums',
              left < 0
                ? 'font-semibold text-rose-700 dark:text-rose-400'
                : 'text-[var(--muted-foreground)]',
            )}
          >
            {left < 0
              ? t('categoryBudgets.over', { amount: money(-left), pct })
              : t('categoryBudgets.left', { amount: money(left), pct })}
          </p>
        </>
      )}
    </Link>
  );
}

/** Monthly budgets per category, each opening its spending detail. */
export default function CategoryBudgets() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const period = periodOf(month);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    api
      .get('/stats/category-budgets', { params: { period } })
      .then((res) => {
        if (!alive) return;
        setItems(res.data.items || []);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [period]);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            {t('categoryBudgets.title')}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {t('categoryBudgets.subtitle')}
          </p>
        </div>
        <MonthStepper value={month} onChange={setMonth} />
      </div>

      {status === 'loading' && (
        <div className="p-5 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-[var(--muted)] animate-pulse motion-reduce:animate-none"
            />
          ))}
        </div>
      )}
      {status === 'error' && (
        <p className="p-5 text-sm text-rose-700 dark:text-rose-400">
          {t('categoryBudgets.loadFailed')}
        </p>
      )}
      {status === 'ready' && items.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t('categoryBudgets.empty')}
          </p>
          <Link
            to="/settings/categories"
            className="mt-2 inline-flex items-center min-h-11 sm:min-h-0 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {t('categoryBudgets.setUp')}
          </Link>
        </div>
      )}
      {status === 'ready' && items.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li key={item.id}>
              <BudgetRow item={item} period={period} />
              {item.children.length > 0 && (
                <ul className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <BudgetRow item={child} period={period} child />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

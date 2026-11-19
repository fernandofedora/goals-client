import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../../api';
import Button from '../ui/button';
import ConfirmDialog from '../ui/confirm-dialog';
import RowMenu from '../ui/row-menu';
import BudgetRow from './BudgetRow';
import BudgetFormDialog from './BudgetFormDialog';
import { onTransactionsChanged } from '../../utils/transactionEvents';

/** Flexible budgets: each in its running period, with create, edit, delete. */
export default function SpendingBudgets() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  // null = closed, 'new' = create, a budget = edit.
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    return api
      .get('/spending-budgets')
      .then((res) => {
        setItems(res.data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    load();
    return onTransactionsChanged(load);
  }, [load]);

  const confirmDelete = async () => {
    try {
      await api.delete(`/spending-budgets/${deleting.id}`);
      toast.success(t('budgets.deleted'));
      load();
    } catch {
      toast.error(t('budgets.deleteFailed'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            {t('budgets.title')}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {t('budgets.subtitle')}
          </p>
        </div>
        {status === 'ready' && items.length > 0 && (
          <Button variant="primary" onClick={() => setEditing('new')}>
            {t('budgets.new')}
          </Button>
        )}
      </div>

      {status === 'loading' && (
        <div className="p-5 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--muted)] animate-pulse motion-reduce:animate-none"
            />
          ))}
        </div>
      )}
      {status === 'error' && (
        <p className="p-5 text-sm text-rose-700 dark:text-rose-400">
          {t('budgets.loadFailed')}
        </p>
      )}
      {status === 'ready' && items.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {t('budgets.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
            {t('budgets.emptyHint')}
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => setEditing('new')}
          >
            {t('budgets.new')}
          </Button>
        </div>
      )}
      {status === 'ready' && items.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((budget) => (
            <li key={budget.id}>
              <BudgetRow
                budget={budget}
                actions={
                  <RowMenu
                    label={t('budgets.actionsFor', { name: budget.name })}
                    items={[
                      {
                        label: t('budgets.edit'),
                        onClick: () => setEditing(budget),
                      },
                      {
                        label: t('budgets.delete'),
                        danger: true,
                        onClick: () => setDeleting(budget),
                      },
                    ]}
                  />
                }
              />
            </li>
          ))}
        </ul>
      )}

      <BudgetFormDialog
        open={editing !== null}
        budget={editing === 'new' ? null : editing}
        hasCatchAll={items.some((b) => b.isCatchAll && b.id !== editing?.id)}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('budgets.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('budgets.deleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}

import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../../api';
import ConfirmDialog from '../ui/confirm-dialog';
import { cn } from '../../lib/utils';
import { translateServerError } from '../../utils/serverError';
import { formatDate, formatMoney, formatShares } from './format';

/** Purchase history of one holding, with edit (delegated) and delete. */
export default function PurchasesDialog({
  open,
  onOpenChange,
  holding,
  onEdit,
  onChanged,
}) {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    if (!holding) return;
    setLoading(true);
    try {
      const res = await api.get(`/investments/${holding.id}/purchases`);
      setPurchases(res.data.purchases);
    } catch (err) {
      toast.error(
        translateServerError(err, t, 'investments.history.loadFailed'),
      );
    } finally {
      setLoading(false);
    }
  }, [holding, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/investments/purchases/${target.id}`);
      toast.success(t('investments.history.deleted'));
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(
        translateServerError(err, t, 'investments.history.deleteFailed'),
      );
    }
  };

  const quoteCurrency = holding?.quoteCurrency;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Dialog.Content
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-[95vw] max-w-2xl rounded-2xl border border-[var(--border)] bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto',
            )}
          >
            <Dialog.Close
              className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={t('common.close')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Dialog.Close>

            <Dialog.Title className="text-lg font-bold pr-8">
              {t('investments.history.title')}
            </Dialog.Title>
            {holding && (
              <Dialog.Description className="text-sm text-[var(--muted-foreground)] mt-0.5">
                <span className="font-semibold text-[var(--foreground)]">
                  {holding.symbol}
                </span>{' '}
                · {holding.name}
              </Dialog.Description>
            )}

            <div className="mt-5">
              {loading ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t('common.loading')}
                </p>
              ) : purchases.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t('investments.history.empty')}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {purchases.map((p) => (
                    <li
                      key={p.id}
                      className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                    >
                      <div className="flex-1 min-w-[10rem]">
                        <p className="text-sm font-semibold">
                          {formatDate(p.date)}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {t('investments.history.sharesAt', {
                            shares: formatShares(p.shares),
                            price: formatMoney(p.pricePerShare, quoteCurrency),
                          })}
                        </p>
                        {p.note && (
                          <p className="text-xs text-[var(--muted-foreground)] italic truncate">
                            {p.note}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatMoney(p.amountQuote, quoteCurrency)}
                        </p>
                        {p.userCurrency !== quoteCurrency && (
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {formatMoney(p.amountUser, p.userCurrency)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] font-medium"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('investments.history.deleteTitle')}
        description={t('investments.history.deleteHint')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

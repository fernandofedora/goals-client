import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import api from '../api';
import TransactionForm from './TransactionForm';
import { cn } from '../lib/utils';
import { emitTransactionsChanged } from '../utils/transactionEvents';

/**
 * Global "+ Transacción" dialog (opened from the navbar, the mobile floating
 * button or the `N` shortcut). Loads the pickers' data each time it opens so
 * categories/cards created elsewhere are always there.
 */
export default function QuickAddTransaction({
  open,
  onOpenChange,
  account = null,
}) {
  const { t } = useTranslation();
  const [data, setData] = useState(null); // { categories, cards, accounts }
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadError(false);
    Promise.all([
      api.get('/categories'),
      api.get('/cards'),
      api.get('/accounts'),
    ])
      .then(([cat, card, acc]) => {
        if (cancelled) return;
        setData({
          categories: cat.data,
          cards: card.data,
          accounts: acc.data,
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const accountName =
    account &&
    data &&
    (account.kind === 'card' ? data.cards : data.accounts).find(
      (x) => x.id === account.id,
    )?.name;

  const onCreated = ({ addAnother }) => {
    emitTransactionsChanged();
    if (!addAnother) onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          className={cn(
            'fixed z-50 bg-white dark:bg-slate-900 border border-[var(--border)] shadow-xl overflow-y-auto',
            // Phones: bottom sheet within thumb reach. sm+: centered dialog.
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[95vw] sm:max-w-lg sm:max-h-[90vh] sm:rounded-xl sm:p-6',
          )}
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
              {accountName
                ? t('quickAdd.titleFor', { name: accountName })
                : t('quickAdd.title')}
            </Dialog.Title>
            <Dialog.Close
              className="-mr-2 -mt-2 inline-flex items-center justify-center size-11 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Dialog.Close>
          </div>

          {loadError ? (
            <p className="py-8 text-center text-sm text-rose-600 dark:text-rose-400">
              {t('quickAdd.loadFailed')}
            </p>
          ) : !data ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('quickAdd.loading')}
            </p>
          ) : (
            <TransactionForm
              variant="dialog"
              account={account}
              categories={data.categories}
              cards={data.cards}
              accounts={data.accounts}
              onCreated={onCreated}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

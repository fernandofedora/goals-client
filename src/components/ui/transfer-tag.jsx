import { useTranslation } from 'react-i18next';

/** Marks a movement between own accounts, which totals may leave out. */
export default function TransferTag({ category }) {
  const { t } = useTranslation();
  if (category?.type !== 'transfer') return null;
  return (
    <span className="inline-flex flex-shrink-0 items-center px-1.5 py-px rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-[11px] font-medium leading-4 text-slate-700 dark:text-slate-200">
      {t('transactions.transferTag')}
    </span>
  );
}

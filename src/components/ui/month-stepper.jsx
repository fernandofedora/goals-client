import { useTranslation } from 'react-i18next';
import { intlLocale } from '../../utils/dateLocale';
import { cn } from '../../lib/utils';
import { shiftMonth } from '../../utils/months';

function Chevron({ dir }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

const stepClass =
  'inline-flex items-center justify-center size-11 sm:size-9 rounded-lg cursor-pointer text-[var(--foreground)] hover:bg-[var(--muted)] active:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

/** `‹ noviembre de 2026 ›`: steps one calendar month at a time. */
export default function MonthStepper({ value, onChange, className }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 p-1',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label={t('ui.monthStepper.prev')}
        className={stepClass}
      >
        <Chevron dir="prev" />
      </button>
      <span
        className="min-w-36 text-center text-sm font-semibold capitalize text-[var(--foreground)]"
        aria-live="polite"
      >
        {value.toLocaleDateString(intlLocale(), {
          month: 'long',
          year: 'numeric',
        })}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label={t('ui.monthStepper.next')}
        className={stepClass}
      >
        <Chevron dir="next" />
      </button>
    </div>
  );
}

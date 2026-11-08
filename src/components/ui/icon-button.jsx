import { cn } from '../../lib/utils';

// 44px touch target on phones, compact 32px from `sm` up.
export default function IconButton({
  onClick,
  title,
  danger,
  className,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center justify-center size-11 sm:size-8 rounded-lg transition-colors flex-shrink-0 cursor-pointer',
        danger
          ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:bg-rose-100 dark:active:bg-rose-950/60'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600',
        className,
      )}
    >
      {children}
    </button>
  );
}

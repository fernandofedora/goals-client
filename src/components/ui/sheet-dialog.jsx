import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

/** Bottom sheet on phones, centered dialog from `sm` up. Escape closes it. */
export default function SheetDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          // Without a description Radix needs an explicit undefined to skip its warning.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-50 bg-[var(--card)] border border-[var(--border)] shadow-xl overflow-y-auto',
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[95vw] sm:max-w-lg sm:max-h-[90vh] sm:rounded-xl sm:p-6',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold text-[var(--foreground)]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={t('common.close')}
              className="-mr-2 -mt-1 size-11 flex-shrink-0 inline-flex items-center justify-center rounded-lg cursor-pointer text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
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
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';

function ConfirmDialog({ open, onOpenChange, title, description, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className={cn('fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50', 'w-[90vw] max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg')}> 
          {title && <Dialog.Title className="text-lg font-semibold mb-2">{title}</Dialog.Title>}
          {description && <Dialog.Description className="text-sm text-[var(--muted-foreground)] mb-4">{description}</Dialog.Description>}
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)]" onClick={onCancel}>{cancelText}</button>
            <button className="px-3 py-2 rounded-md bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90" onClick={onConfirm}>{confirmText}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ConfirmDialog;


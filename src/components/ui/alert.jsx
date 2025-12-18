import React from 'react';
import { cn } from '../../lib/utils';

function Alert({ variant = 'success', message, onClose, className }) {
  const themes = {
    success: 'bg-[var(--muted)] text-emerald-700 border border-[var(--border)]',
    error: 'bg-[var(--muted)] text-rose-700 border border-[var(--border)]'
  };
  return (
    <div className={cn('relative rounded-md p-4', themes[variant], className)}>
      <div className="pr-8">{message}</div>
      {onClose && (
        <button type="button" aria-label="Close" className="absolute top-2 right-2 hover:opacity-80" onClick={onClose}>×</button>
      )}
    </div>
  );
}

export default Alert;


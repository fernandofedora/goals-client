import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Accessible toggle switch. No external dependency.
 * Props: checked, onCheckedChange(next), disabled, id, className
 */
const Switch = React.forwardRef(({ checked = false, onCheckedChange, disabled = false, id, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-emerald-600' : 'bg-[var(--muted)] border border-[var(--border)]',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
});

Switch.displayName = 'Switch';

export default Switch;

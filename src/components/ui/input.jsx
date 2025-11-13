import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
        'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;

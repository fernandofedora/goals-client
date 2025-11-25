import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        type === 'color'
          ? 'inline-block align-middle w-8 h-8 rounded-md border p-0 cursor-pointer bg-transparent [appearance:auto]'
          : 'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
        'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      type={type}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;

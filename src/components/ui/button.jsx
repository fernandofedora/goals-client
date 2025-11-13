import React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(({ className, type = 'button', variant = 'primary', ...props }, ref) => {
  const variants = {
    primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90',
    secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90',
    outline: 'border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)]',
    subtle: 'bg-[var(--muted)] text-[var(--foreground)] hover:opacity-90',
    destructive: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90'
  };
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium',
        'px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant] || variants.primary,
        className
      )}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export default Button;

import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export default function DateInput({ value, onChange, placeholder = 'Date', className = '', required = false, min, max, name, id }) {
  const [type, setType] = useState(value ? 'date' : 'text');

  useEffect(() => {
    // Si hay valor, usamos 'date' para que se muestre formateado; si no, mostramos placeholder
    setType(value ? 'date' : 'text');
  }, [value]);

  const handleFocus = () => setType('date');
  const handleBlur = (e) => {
    // Si el usuario no seleccionó nada, volver a 'text' para mantener el placeholder visible
    if (!e.target.value) setType('text');
  };

  return (
    <div className="relative">
      <input
        className={cn(
          'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
          'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          type === 'text' ? 'pr-10' : '',
          className
        )}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={type === 'text' ? placeholder : undefined}
        inputMode={type === 'text' ? 'numeric' : undefined}
        required={required}
        min={min}
        max={max}
        name={name}
        id={id}
      />
      {type === 'text' && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
      )}
    </div>
  );
}

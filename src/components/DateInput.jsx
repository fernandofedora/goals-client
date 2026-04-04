import { cn } from '../lib/utils';

/**
 * DateInput — always renders as type="date" to avoid the mobile double-tap bug.
 *
 * Always type="date" so the native date-picker opens on the first tap.
 * When no value is selected the browser's "mm/dd/yyyy" hint is hidden with
 * text-transparent and replaced by our custom placeholder overlay.
 * On focus (group-focus-within) the overlay is hidden and the input text is
 * restored so the native date picker template is visible and usable.
 */
export default function DateInput({ value, onChange, placeholder = 'Date', className = '', required = false, min, max, name, id }) {
  const isEmpty = !value;

  return (
    <div className="relative group">
      <input
        className={cn(
          'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
          'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // color-scheme tells the browser to render native date-picker UI
          // (including the calendar icon) matching the current theme.
          '[color-scheme:light] dark:[color-scheme:dark]',
          // Hide native "mm/dd/yyyy" hint when empty and not focused.
          // group-focus-within:text-[var(--foreground)] restores it on focus.
          isEmpty
            ? 'text-transparent group-focus-within:text-[var(--foreground)]'
            : '',
          className
        )}
        type="date"
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        name={name}
        id={id}
      />

      {/* Placeholder overlay — hidden as soon as the input is focused */}
      {isEmpty && (
        <span className="pointer-events-none absolute inset-y-0 left-3 right-3 flex items-center justify-between text-sm text-[var(--muted-foreground)] group-focus-within:hidden [&_svg]:text-[var(--foreground)] [&_svg]:opacity-60">
          <span>{placeholder}</span>
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


import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

/** "…" button with a small popover; fixed position so the list never clips it. */
export default function RowMenu({ label, items, className }) {
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!pos) return undefined;
    menuRef.current?.querySelector('button')?.focus();
    const close = () => setPos(null);
    const onDown = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        close();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) {
      setPos(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const height = items.length * 44 + 12;
    const fitsBelow = rect.bottom + height < window.innerHeight;
    setPos({
      top: fitsBelow ? rect.bottom + 4 : rect.top - height - 4,
      right: window.innerWidth - rect.right,
    });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={Boolean(pos)}
        className={cn(
          'size-11 sm:size-8 flex-shrink-0 inline-flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors',
          FOCUS_RING,
          className,
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {pos && (
        <div
          ref={menuRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 min-w-40 max-w-64 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setPos(null);
                item.onClick();
              }}
              className={cn(
                'flex items-center w-[calc(100%-8px)] mx-1 min-h-11 sm:min-h-9 px-3 rounded-md text-sm text-left hover:bg-[var(--muted)]',
                FOCUS_RING,
                item.danger
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-[var(--foreground)]',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

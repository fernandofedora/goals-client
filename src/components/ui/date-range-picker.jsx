import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

/**
 * DateRangePicker
 * A popover-style date range picker using react-day-picker mode="range".
 * styled to match the app's dark/light theme.
 *
 * Props:
 *   range  – { from: Date|undefined, to: Date|undefined }
 *   onChange – (range) => void
 *   className – optional extra classes for the trigger button
 */
export default function DateRangePicker({ range, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const fmt = (d) =>
    d
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

  const label =
    range?.from && range?.to
      ? `${fmt(range.from)} → ${fmt(range.to)}`
      : range?.from
      ? `${fmt(range.from)} → …`
      : 'Select date range';

  const hasRange = range?.from && range?.to;

  return (
    <div ref={ref} className="relative" style={{ zIndex: 50 }}>
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-all duration-150',
          'bg-white dark:bg-slate-800',
          'border border-[var(--border)] shadow-sm',
          'hover:bg-gray-50 dark:hover:bg-slate-700',
          'text-gray-700 dark:text-gray-300',
          open ? 'ring-2 ring-indigo-400/50' : '',
          className,
        ].join(' ')}
      >
        <CalendarIcon />
        <span className="max-w-[240px] truncate">{label}</span>
        {hasRange && (
          <span
            role="button"
            title="Clear range"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: undefined, to: undefined });
              setOpen(false);
            }}
            className="ml-1 flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            ×
          </span>
        )}
        <ChevronIcon open={open} />
      </button>

      {/* ── Popover ── */}
      {open && (
        <div
          className={[
            'absolute top-full mt-2 left-0',
            'bg-white dark:bg-slate-900',
            'border border-[var(--border)] rounded-2xl shadow-xl',
            'p-4 z-50',
            'animate-in fade-in-0 zoom-in-95 duration-150',
          ].join(' ')}
          style={{ minWidth: 296 }}
        >
          <DayPickerRange range={range} onChange={onChange} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/* ─── Inner DayPicker with range mode ─── */
function DayPickerRange({ range, onChange, onClose }) {
  const [month, setMonth] = useState(range?.from ?? new Date());

  return (
    <div className="rdp-root">
      <DayPicker
        mode="range"
        selected={range}
        onSelect={(r) => {
          onChange(r ?? { from: undefined, to: undefined });
          // Auto-close once full range selected
          if (r?.from && r?.to) setTimeout(onClose, 180);
        }}
        month={month}
        onMonthChange={setMonth}
        numberOfMonths={1}
        showOutsideDays
        captionLayout="dropdown"
        fromYear={2020}
        toYear={new Date().getFullYear() + 1}
      />
      {/* Quick presets */}
      <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-1.5">
        {presets.map(({ label, getRange }) => (
          <button
            key={label}
            onClick={() => {
              const r = getRange();
              onChange(r);
              onClose();
            }}
            className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-gray-600 dark:text-gray-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-medium text-left"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Quick-range presets ─── */
const today = () => new Date();
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const presets = [
  {
    label: 'This month',
    getRange: () => ({ from: startOfMonth(), to: endOfMonth() }),
  },
  {
    label: 'Last month',
    getRange: () => {
      const t = today();
      const y = t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear();
      const m = t.getMonth() === 0 ? 11 : t.getMonth() - 1;
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
    },
  },
  {
    label: 'Last 3 months',
    getRange: () => {
      const t = today();
      const from = new Date(t.getFullYear(), t.getMonth() - 2, 1);
      return { from, to: endOfMonth() };
    },
  },
  {
    label: 'Last 6 months',
    getRange: () => {
      const t = today();
      const from = new Date(t.getFullYear(), t.getMonth() - 5, 1);
      return { from, to: endOfMonth() };
    },
  },
  {
    label: 'This year',
    getRange: () => {
      const y = today().getFullYear();
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    },
  },
  {
    label: 'Last year',
    getRange: () => {
      const y = today().getFullYear() - 1;
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    },
  },
];

/* ─── Small SVG icons ─── */
function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-indigo-400">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

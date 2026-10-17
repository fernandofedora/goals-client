import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { formatMoney } from './format';

// Part-to-whole of the portfolio as one stacked bar + legend (the legend doubles
// as the table view, so values never rely on color alone).
// Colors follow the holding, not its rank: a holding keeps its slot (creation
// order, the order the API returns) while values move. The palette has 6
// validated slots; holdings beyond them, or beyond the 5 largest when there are
// more than 6, fold into a neutral "Other".
const SLOTS = 6;
const slotColor = (slot) =>
  slot == null ? 'var(--alloc-other)' : `var(--alloc-${slot + 1})`;

function buildSegments(holdings) {
  const eligible = holdings.filter((h) => !h.fxUnavailable && h.valueUser > 0);
  if (eligible.length < 2) return null;
  const total = eligible.reduce((s, h) => s + h.valueUser, 0);
  const slotOf = new Map(eligible.map((h, i) => [h.id, i < SLOTS ? i : null]));
  const byValue = [...eligible].sort((a, b) => b.valueUser - a.valueUser);
  const keep = eligible.length <= SLOTS ? byValue : byValue.slice(0, SLOTS - 1);

  const segments = [];
  let otherValue = 0;
  let otherCount = 0;
  for (const h of byValue) {
    const slot = slotOf.get(h.id);
    if (keep.includes(h) && slot != null) {
      segments.push({
        key: h.id,
        label: h.symbol,
        name: h.name,
        value: h.valueUser,
        slot,
      });
    } else {
      otherValue += h.valueUser;
      otherCount += 1;
    }
  }
  if (otherCount) {
    segments.push({
      key: 'other',
      label: null,
      value: otherValue,
      slot: null,
      count: otherCount,
    });
  }
  return segments.map((s) => ({ ...s, pct: (s.value / total) * 100 }));
}

export default function AllocationBar({ holdings, currency }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(null);
  const segments = buildSegments(holdings);
  if (!segments) return null; // one holding = 100%: the table already says it

  const labelOf = (s) =>
    s.label ?? t('investments.allocation.other', { count: s.count });
  const pctText = (s) => `${s.pct.toFixed(1)}%`;
  const hovered = segments.find((s) => s.key === hover);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm px-5 py-4">
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {t('investments.allocation.title')}
      </h2>

      {/* Bar: 2px surface gaps between segments, 4px rounded ends */}
      <div className="relative mt-3">
        <div
          className="flex h-3 w-full gap-[2px]"
          role="img"
          aria-label={t('investments.allocation.aria', {
            items: segments
              .map((s) => `${labelOf(s)} ${pctText(s)}`)
              .join(', '),
          })}
          onMouseLeave={() => setHover(null)}
        >
          {segments.map((s, i) => (
            <div
              key={s.key}
              onMouseMove={() => hover !== s.key && setHover(s.key)}
              className={cn(
                'h-full min-w-[3px] transition-opacity',
                i === 0 && 'rounded-l-[4px]',
                i === segments.length - 1 && 'rounded-r-[4px]',
                hover && hover !== s.key && 'opacity-35',
              )}
              style={{
                flexGrow: s.value,
                flexBasis: 0,
                backgroundColor: slotColor(s.slot),
              }}
            />
          ))}
        </div>
        {hovered && (
          <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[var(--border)] bg-white dark:bg-slate-800 px-3 py-1.5 text-xs shadow-lg">
            <span className="font-semibold">{labelOf(hovered)}</span>{' '}
            <span className="text-[var(--muted-foreground)]">
              {pctText(hovered)} · {formatMoney(hovered.value, currency)}
            </span>
          </div>
        )}
      </div>

      {/* Legend = table view */}
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
        {segments.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center gap-2 text-sm min-w-0"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: slotColor(s.slot) }}
              aria-hidden="true"
            />
            <span className="font-semibold shrink-0">{labelOf(s)}</span>
            {s.name && (
              <span className="truncate text-xs text-[var(--muted-foreground)]">
                {s.name}
              </span>
            )}
            <span className="ml-auto shrink-0 tabular-nums text-[var(--muted-foreground)]">
              {pctText(s)}
            </span>
            <span className="shrink-0 tabular-nums font-medium w-28 text-right">
              {formatMoney(s.value, currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

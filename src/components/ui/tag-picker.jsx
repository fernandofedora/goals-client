import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../../api';
import { foldText } from '../../utils/categories';
import { cn } from '../../lib/utils';

const MAX_TAGS = 10;
const PALETTE = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#64748b',
];

/**
 * Chips for the chosen tags plus a box to find one or create it with Enter.
 * `value` is a list of tag ids; it loads the user's tags itself.
 */
export default function TagPicker({
  value = [],
  onChange,
  id: idProp,
  className,
}) {
  const { t } = useTranslation();
  const autoId = useId();
  const id = idProp || autoId;
  const [tags, setTags] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    api
      .get('/tags')
      .then((res) => setTags(res.data))
      // Without tags the picker still lets the user type a new one.
      .catch(() => setTags([]));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const chosen = useMemo(
    () => value.map((v) => tags.find((tag) => tag.id === v)).filter(Boolean),
    [tags, value],
  );
  const q = foldText(query.trim());
  const options = useMemo(
    () =>
      tags
        .filter(
          (tag) =>
            !value.includes(tag.id) && (!q || foldText(tag.name).includes(q)),
        )
        .slice(0, 8),
    [tags, value, q],
  );
  const exact = tags.some((tag) => foldText(tag.name) === q);
  const canCreate =
    q.length > 0 && !exact && !query.includes(',') && query.trim().length <= 40;
  const items = [
    ...options.map((tag) => ({ kind: 'tag', tag })),
    ...(canCreate ? [{ kind: 'new' }] : []),
  ];
  const full = value.length >= MAX_TAGS;

  const add = (tagId) => {
    if (full || value.includes(tagId)) return;
    onChange([...value, tagId]);
    setQuery('');
    setActive(0);
  };

  const create = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/tags', {
        name: query.trim(),
        color: PALETTE[tags.length % PALETTE.length],
      });
      setTags((list) => [...list, data]);
      add(data.id);
    } catch (err) {
      const code = err?.response?.data?.code;
      toast.error(
        code
          ? t(`tags.errors.${code}`, { defaultValue: t('tags.saveFailed') })
          : t('tags.saveFailed'),
      );
    } finally {
      setBusy(false);
    }
  };

  const pick = (item) => (item.kind === 'new' ? create() : add(item.tag.id));

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // Never submit the surrounding form from the tag box.
      e.preventDefault();
      if (items[active] && !busy) pick(items[active]);
    } else if (e.key === 'Backspace' && !query && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <div className="flex flex-wrap items-center gap-1.5 min-h-11 sm:min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 focus-within:ring-2 focus-within:ring-[var(--ring)]">
        {chosen.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--muted)] pl-2 pr-0.5 text-xs font-medium text-[var(--foreground)]"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: tag.color }}
            />
            {tag.name}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag.id))}
              aria-label={t('tags.remove', { name: tag.name })}
              className="inline-flex size-6 items-center justify-center rounded cursor-pointer text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          id={id}
          value={query}
          disabled={full}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open && items[active] ? `${id}-opt-${active}` : undefined
          }
          autoComplete="off"
          placeholder={
            full ? t('tags.full') : chosen.length ? '' : t('tags.placeholder')
          }
          className="flex-1 min-w-24 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {open && items.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
        >
          {items.map((item, i) => (
            <li
              key={item.kind === 'new' ? 'new' : item.tag.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(item)}
              className={cn(
                'flex items-center gap-2 px-3 min-h-11 sm:min-h-9 text-sm cursor-pointer text-[var(--foreground)]',
                i === active && 'bg-[var(--muted)]',
              )}
            >
              {item.kind === 'new' ? (
                t('tags.create', { name: query.trim() })
              ) : (
                <>
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: item.tag.color }}
                  />
                  {item.tag.name}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

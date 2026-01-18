import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { cn } from '../../lib/utils';

function extractOptions(children) {
  const opts = [];
  let placeholderText = null;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const value = child.props.value ?? '';
    const label = child.props.children ?? '';
    if (String(value) === '') {
      placeholderText = String(label);
    }
    opts.push({ value: String(value), label: String(label) });
  });
  return { options: opts, placeholderText };
}

const Select = React.forwardRef(({ className, children, value = '', onChange, placeholder, required, name, disabled, searchable, searchPlaceholder = 'Buscar...', noResultsText = 'Sin resultados', maxHeight, searchThreshold = 8, filterFn }, ref) => {
  const { options, placeholderText } = extractOptions(children);
  const normalizedValue = value == null ? '' : String(value);
  const selectedLabel = (normalizedValue === ''
    ? (placeholder || placeholderText || 'Select')
    : (options.find(o => o.value === normalizedValue)?.label || placeholder || 'Select'));
  const handleChange = (val) => {
    if (val === '__empty__') val = '';
    if (typeof onChange === 'function') {
      onChange({ target: { value: val, name } });
    }
  };
  const [query, setQuery] = React.useState('');
  const enableSearch = searchable || options.length > searchThreshold;
  const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = React.useMemo(() => {
    if (!enableSearch || !query) return options;
    const q = normalize(query);
    if (typeof filterFn === 'function') return options.filter(o => filterFn(q, o));
    return options.filter(o => normalize(o.label).includes(q) || normalize(o.value).includes(q));
  }, [options, enableSearch, query, filterFn]);
  const menuMaxH = maxHeight ? String(maxHeight) : '70vh';
  const viewportStyle = enableSearch
    ? { maxHeight: `calc(${menuMaxH} - 2.5rem)` }
    : { maxHeight: menuMaxH };
  return (
    <div className={cn('relative inline-block', className)}>
      <RadixSelect.Root value={normalizedValue} onValueChange={handleChange} disabled={disabled}>
        <RadixSelect.Trigger
          ref={ref}
          className={cn(
            'inline-flex items-center justify-between rounded-md border px-3 py-2 text-sm w-full',
            'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <RadixSelect.Value placeholder={selectedLabel} />
          <RadixSelect.Icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content position="popper" sideOffset={6} collisionPadding={8} className="z-50 min-w-[var(--radix-select-trigger-width)] rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-md overflow-hidden">
            <RadixSelect.ScrollUpButton className="flex items-center justify-center py-1 text-[var(--muted-foreground)]">
              ▲
            </RadixSelect.ScrollUpButton>
            {enableSearch && (
              <div className="px-2 pt-2 sticky top-0 bg-[var(--card)] z-10">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={cn(
                    'w-full rounded-md border px-2 py-1 text-sm',
                    'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]'
                  )}
                />
              </div>
            )}
            <RadixSelect.Viewport className="p-1 overflow-y-auto overscroll-contain" style={viewportStyle}>
              {placeholderText && (
                <RadixSelect.Item
                  value="__empty__"
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-[var(--muted)]"
                >
                  <RadixSelect.ItemText>{placeholderText}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2">✓</RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              )}
              {(filtered.filter(o => o.value !== '')).map((o) => (
                <RadixSelect.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-[var(--muted)]"
                >
                  <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2">
                    ✓
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
              {enableSearch && filtered.filter(o => o.value !== '').length === 0 && (
                <div className="px-2 py-2 text-sm text-[var(--muted-foreground)]">
                  {noResultsText}
                </div>
              )}
            </RadixSelect.Viewport>
            <RadixSelect.ScrollDownButton className="flex items-center justify-center py-1 text-[var(--muted-foreground)]">
              ▼
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      <select
        name={name}
        required={required}
        value={normalizedValue}
        onChange={() => {}}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      >
        {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;

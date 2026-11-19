import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import Button from './ui/button';
import Input from './ui/input';
import Select from './ui/select';
import SheetDialog from './ui/sheet-dialog';
import { useCurrency } from '../context/CurrencyContext';
import { categoriesForTxType, categoryOptions } from '../utils/categories';
import { emitTransactionsChanged } from '../utils/transactionEvents';
import { cn } from '../lib/utils';

const MAX_PARTS = 20;
const cents = (v) => Math.round((Number(v) || 0) * 100);
const blankPart = () => ({
  key: Math.random().toString(36).slice(2),
  amount: '',
  categoryId: '',
  description: '',
});

/** Split one purchase into parts with their own category; they must add up. */
export default function SplitDialog({ transactionId, onClose, categories }) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const [original, setOriginal] = useState(null);
  const [parts, setParts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!transactionId) return;
    let alive = true;
    setOriginal(null);
    setFailed(false);
    api
      .get(`/transactions/${transactionId}/split`)
      .then(({ data }) => {
        if (!alive) return;
        setOriginal(data.original);
        setParts(
          data.parts.length
            ? data.parts.map((p) => ({
                key: String(p.id),
                amount: String(Number(p.amount)),
                categoryId: String(p.CategoryId),
                description:
                  p.description === data.original.description
                    ? ''
                    : p.description,
              }))
            : [
                // The first part starts as the whole purchase in its category.
                {
                  ...blankPart(),
                  amount: String(data.original.amount),
                  categoryId: data.original.categoryId
                    ? String(data.original.categoryId)
                    : '',
                },
                blankPart(),
              ],
        );
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [transactionId]);

  const options = useMemo(
    () =>
      original
        ? categoryOptions(categoriesForTxType(categories, original.type))
        : [],
    [categories, original],
  );
  const left = original
    ? cents(original.amount) - parts.reduce((s, p) => s + cents(p.amount), 0)
    : 0;
  const complete = parts.every((p) => cents(p.amount) > 0 && p.categoryId);
  const canSave =
    original && left === 0 && complete && parts.length >= 2 && !busy;

  const patch = (key, change) =>
    setParts((list) =>
      list.map((p) => (p.key === key ? { ...p, ...change } : p)),
    );
  const fillRest = (key) =>
    setParts((list) =>
      list.map((p) =>
        p.key === key
          ? { ...p, amount: String((cents(p.amount) + left) / 100) }
          : p,
      ),
    );

  const errorText = (err, fallback) => {
    const code = err?.response?.data?.code;
    return code
      ? t(`split.errors.${code}`, { defaultValue: t(fallback) })
      : t(fallback);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/transactions/${transactionId}/split`, {
        parts: parts.map((p) => ({
          amount: cents(p.amount) / 100,
          categoryId: Number(p.categoryId),
          ...(p.description.trim()
            ? { description: p.description.trim() }
            : {}),
        })),
      });
      toast.success(t('split.saved', { count: parts.length }));
      emitTransactionsChanged();
      onClose(true);
    } catch (err) {
      toast.error(errorText(err, 'split.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    try {
      await api.delete(`/transactions/${transactionId}/split`);
      toast.success(t('split.joined'));
      emitTransactionsChanged();
      onClose(true);
    } catch {
      toast.error(t('split.joinFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetDialog
      open={Boolean(transactionId)}
      onOpenChange={(open) => !open && onClose(false)}
      title={original?.isSplit ? t('split.editTitle') : t('split.title')}
      description={t('split.subtitle')}
    >
      {failed && (
        <p className="text-sm text-rose-700 dark:text-rose-400">
          {t('split.loadFailed')}
        </p>
      )}
      {!failed && !original && (
        <div className="h-40 rounded-xl bg-[var(--muted)] animate-pulse motion-reduce:animate-none" />
      )}
      {original && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] px-4 py-3 flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                {original.description}
              </span>
              <span className="block text-xs text-[var(--muted-foreground)]">
                {original.date}
              </span>
            </span>
            <span className="text-base font-bold tabular-nums text-[var(--foreground)]">
              {money(original.amount)}
            </span>
          </div>

          <ol className="space-y-3">
            {parts.map((p, i) => (
              <li
                key={p.key}
                className="rounded-xl border border-[var(--border)] p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                    {t('split.part', { n: i + 1 })}
                  </span>
                  <span className="flex gap-1">
                    {left !== 0 && cents(p.amount) + left > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillRest(p.key)}
                      >
                        {left > 0 ? t('split.addRest') : t('split.takeExcess')}
                      </Button>
                    )}
                    {parts.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setParts((list) =>
                            list.filter((x) => x.key !== p.key),
                          )
                        }
                        aria-label={t('split.removePart', { n: i + 1 })}
                      >
                        {t('split.remove')}
                      </Button>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    aria-label={t('split.amountOf', { n: i + 1 })}
                    placeholder="0.00"
                    value={p.amount}
                    onChange={(e) => patch(p.key, { amount: e.target.value })}
                  />
                  <Select
                    value={p.categoryId}
                    onChange={(e) =>
                      patch(p.key, { categoryId: e.target.value })
                    }
                  >
                    <option value="">{t('split.pickCategory')}</option>
                    {options.map((o) => (
                      <option key={o.id} value={String(o.id)}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  aria-label={t('split.descriptionOf', { n: i + 1 })}
                  placeholder={t('split.descriptionPlaceholder', {
                    description: original.description,
                  })}
                  maxLength={255}
                  value={p.description}
                  onChange={(e) =>
                    patch(p.key, { description: e.target.value })
                  }
                />
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={parts.length >= MAX_PARTS}
              onClick={() =>
                setParts((list) => [
                  ...list,
                  {
                    ...blankPart(),
                    amount: left > 0 ? String(left / 100) : '',
                  },
                ])
              }
            >
              {t('split.addPart')}
            </Button>
            <p
              role="status"
              className={cn(
                'text-sm font-semibold tabular-nums',
                left === 0 && complete
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : left >= 0
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-rose-700 dark:text-rose-400',
              )}
            >
              {left === 0
                ? complete
                  ? t('split.balanced')
                  : t('split.incomplete')
                : left > 0
                  ? t('split.left', { amount: money(left / 100) })
                  : t('split.over', { amount: money(-left / 100) })}
            </p>
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-1">
            {original.isSplit ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={join}
              >
                {t('split.join')}
              </Button>
            ) : (
              <span />
            )}
            <span className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!canSave}
                onClick={save}
              >
                {t('split.save', { count: parts.length })}
              </Button>
            </span>
          </div>
        </div>
      )}
    </SheetDialog>
  );
}

import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../../api';
import Input from '../ui/input';
import Button from '../ui/button';
import DateInput from '../DateInput';
import { cn } from '../../lib/utils';
import { translateServerError } from '../../utils/serverError';
import { formatMoney, formatShares, todayStr } from './format';

const EMPTY = {
  amount: '',
  amountCurrency: 'user',
  pricePerShare: '',
  shares: '',
  date: '',
  note: '',
};

const positive = (v) => {
  const n = Number(v);
  return v !== '' && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Create / add / edit a purchase.
 * - mode 'new':  asset = catalog entry from the search ({providerSymbol, symbol, name, currency})
 * - mode 'add':  asset = existing holding (adds a purchase to it)
 * - mode 'edit': asset = holding, purchase = the purchase being corrected. Keeps
 *   the FX rate and currency the purchase was recorded with (server does too).
 */
export default function PurchaseDialog({
  open,
  onOpenChange,
  mode,
  asset,
  purchase,
  onSaved,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quoteInfo, setQuoteInfo] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const quoteCurrency = asset?.quoteCurrency || asset?.currency;
  const isEdit = mode === 'edit';

  // Reset the form and load the live quote (not needed to edit: the purchase
  // already carries its price and FX rate).
  useEffect(() => {
    if (!open || !asset) return undefined;
    setError('');
    setQuoteInfo(null);
    if (isEdit && purchase) {
      setForm({
        amount: String(purchase.amountQuote),
        amountCurrency: 'quote',
        pricePerShare: String(purchase.pricePerShare),
        shares: '',
        date: purchase.date,
        note: purchase.note || '',
      });
      setShowAdvanced(true);
      return undefined;
    }
    setForm({ ...EMPTY, date: todayStr() });
    setShowAdvanced(false);
    let cancelled = false;
    setLoadingQuote(true);
    api
      .get(`/investments/quote/${encodeURIComponent(asset.providerSymbol)}`)
      .then((res) => !cancelled && setQuoteInfo(res.data))
      .catch(() => !cancelled && setQuoteInfo({ quote: null }))
      .finally(() => !cancelled && setLoadingQuote(false));
    return () => {
      cancelled = true;
    };
  }, [open, asset, purchase, isEdit]);

  // Currency on the "user" side of the amount toggle and the rate to the asset's.
  const userSideCurrency = isEdit
    ? purchase?.userCurrency
    : quoteInfo?.displayCurrency || quoteCurrency;
  const fxRate = isEdit ? Number(purchase?.fxRate) : quoteInfo?.fxRate || 1;
  const sameCurrency = userSideCurrency === quoteCurrency;
  const amountCurrency = sameCurrency ? 'quote' : form.amountCurrency;
  const currentPrice = isEdit
    ? Number(purchase?.pricePerShare)
    : quoteInfo?.quote?.price || null;

  // Live preview, same math as the server's buildPurchase().
  const preview = useMemo(() => {
    const amount = positive(form.amount);
    const priceIn = positive(form.pricePerShare);
    const sharesIn = positive(form.shares);
    let amountQuote = null;
    if (amount)
      amountQuote = amountCurrency === 'quote' ? amount : amount / fxRate;
    else if (sharesIn && priceIn) amountQuote = sharesIn * priceIn;
    if (!amountQuote) return null;
    const price = priceIn || (sharesIn ? amountQuote / sharesIn : currentPrice);
    if (!price) return null;
    const shares = sharesIn || amountQuote / price;
    return { amountQuote, amountUser: amountQuote * fxRate, price, shares };
  }, [form, amountCurrency, fxRate, currentPrice]);

  const set = (name) => (e) =>
    setForm((f) => ({ ...f, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!preview) {
      setError(
        currentPrice || positive(form.pricePerShare)
          ? t('investments.purchase.amountRequired')
          : t('investments.purchase.priceRequired'),
      );
      return;
    }
    const payload = {
      amount: form.amount === '' ? undefined : Number(form.amount),
      amountCurrency,
      pricePerShare:
        form.pricePerShare === '' ? undefined : Number(form.pricePerShare),
      shares: form.shares === '' ? undefined : Number(form.shares),
      date: form.date || undefined,
      note: form.note.trim() || undefined,
    };
    setSaving(true);
    try {
      if (mode === 'new') {
        await api.post('/investments', {
          ...payload,
          providerSymbol: asset.providerSymbol,
        });
      } else if (mode === 'add') {
        await api.post(`/investments/${asset.id}/purchases`, payload);
      } else {
        await api.put(`/investments/purchases/${purchase.id}`, payload);
      }
      toast.success(
        isEdit
          ? t('investments.purchase.updated')
          : t('investments.purchase.saved'),
      );
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(translateServerError(err, t, 'investments.purchase.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const title = {
    new: t('investments.purchase.titleNew'),
    add: t('investments.purchase.titleAdd'),
    edit: t('investments.purchase.titleEdit'),
  }[mode];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[95vw] max-w-lg rounded-2xl border border-[var(--border)] bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto',
          )}
        >
          <Dialog.Close
            className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={t('common.close')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Dialog.Close>

          <Dialog.Title className="text-lg font-bold pr-8">
            {title}
          </Dialog.Title>
          {asset && (
            <Dialog.Description className="text-sm text-[var(--muted-foreground)] mt-0.5">
              <span className="font-semibold text-[var(--foreground)]">
                {asset.symbol}
              </span>{' '}
              · {asset.name}
            </Dialog.Description>
          )}

          {/* Current price */}
          {!isEdit && (
            <div className="mt-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 px-4 py-3 text-sm">
              {loadingQuote ? (
                <span className="text-[var(--muted-foreground)]">
                  {t('common.loading')}
                </span>
              ) : quoteInfo?.quote ? (
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[var(--muted-foreground)]">
                    {t('investments.purchase.currentPrice')}
                  </span>
                  <span className="font-semibold">
                    {formatMoney(quoteInfo.quote.price, quoteCurrency)}
                    {!sameCurrency && (
                      <span className="ml-2 font-normal text-[var(--muted-foreground)]">
                        ≈ {formatMoney(quoteInfo.priceUser, userSideCurrency)}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  {t('investments.purchase.noPrice')}
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Amount + currency toggle */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="inv-amount"
                className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
              >
                {t('investments.purchase.amount')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="inv-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={form.amount}
                  onChange={set('amount')}
                  placeholder="0.00"
                  autoFocus
                />
                {!sameCurrency && userSideCurrency && (
                  <div className="flex shrink-0 rounded-md border border-[var(--border)] p-0.5 bg-gray-50 dark:bg-slate-800/50">
                    {[
                      ['user', userSideCurrency],
                      ['quote', quoteCurrency],
                    ].map(([value, code]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, amountCurrency: value }))
                        }
                        className={cn(
                          'px-3 rounded text-sm font-semibold transition-colors',
                          form.amountCurrency === value
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
                        )}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live preview */}
            <p
              className="text-sm min-h-5 text-[var(--muted-foreground)]"
              aria-live="polite"
            >
              {preview &&
                t('investments.purchase.preview', {
                  amount: sameCurrency
                    ? formatMoney(preview.amountQuote, quoteCurrency)
                    : `${formatMoney(preview.amountUser, userSideCurrency)} ≈ ${formatMoney(preview.amountQuote, quoteCurrency)}`,
                  shares: formatShares(preview.shares),
                  price: formatMoney(preview.price, quoteCurrency),
                })}
            </p>

            {/* Advanced */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? '▾' : '▸'} {t('investments.purchase.advanced')}
            </button>
            {showAdvanced && (
              <div className="space-y-4 rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t('investments.purchase.advancedHint')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="inv-price"
                      className="text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      {t('investments.purchase.pricePerShare', {
                        currency: quoteCurrency,
                      })}
                    </label>
                    <Input
                      id="inv-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={form.pricePerShare}
                      onChange={set('pricePerShare')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="inv-shares"
                      className="text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      {t('investments.purchase.shares')}
                    </label>
                    <Input
                      id="inv-shares"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={form.shares}
                      onChange={set('shares')}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {t('investments.purchase.date')}
                  </span>
                  <DateInput
                    value={form.date}
                    onChange={set('date')}
                    max={todayStr()}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="inv-note"
                    className="text-xs font-semibold text-gray-500 dark:text-gray-400"
                  >
                    {t('investments.purchase.note')}
                  </label>
                  <Input
                    id="inv-note"
                    maxLength={255}
                    value={form.note}
                    onChange={set('note')}
                  />
                </div>
                {!isEdit && !sameCurrency && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('investments.purchase.fxNote')}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p
                className="text-sm font-medium text-rose-600 dark:text-rose-400"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || (!isEdit && loadingQuote)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700"
              >
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

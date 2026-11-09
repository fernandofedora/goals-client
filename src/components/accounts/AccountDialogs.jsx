import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../../api';
import Button from '../ui/button';
import Input from '../ui/input';
import Switch from '../ui/switch';
import { cn } from '../../lib/utils';

const BANK_DEFAULTS = {
  name: '',
  color: '#059669',
  initialBalance: '',
  isExcludedFromTotals: false,
};
const CARD_DEFAULTS = { name: '', color: '#0ea5e9', last4: '' };

function Shell({ open, onOpenChange, title, children }) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed z-50 bg-[var(--card)] border border-[var(--border)] shadow-xl overflow-y-auto',
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[95vw] sm:max-w-md sm:max-h-[90vh] sm:rounded-xl sm:p-6',
          )}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <Dialog.Title className="text-lg font-bold text-[var(--foreground)]">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t('common.close')}
              className="-mr-2 size-11 inline-flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
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
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ id, label, children }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-[var(--foreground)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ColorInput({ id, value, onChange }) {
  return (
    <input
      id={id}
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 sm:h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] p-1 cursor-pointer"
    />
  );
}

function BankFields({ form, set, withBalance }) {
  const { t } = useTranslation();
  return (
    <>
      <Field id="acc-name" label={t('accountsPage.accountName')}>
        <Input
          id="acc-name"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={t('accountsPage.accountNamePlaceholder')}
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {withBalance && (
          <Field id="acc-balance" label={t('accountsPage.startingBalance')}>
            <Input
              id="acc-balance"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={form.initialBalance}
              onChange={(e) => set({ initialBalance: e.target.value })}
            />
          </Field>
        )}
        <Field id="acc-color" label={t('accountsPage.color')}>
          <ColorInput
            id="acc-color"
            value={form.color}
            onChange={(color) => set({ color })}
          />
        </Field>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {t('accountsPage.doNotIntegrate')}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {t('accountsPage.doNotIntegrateHint')}
          </p>
        </div>
        <Switch
          checked={form.isExcludedFromTotals}
          onCheckedChange={(val) => set({ isExcludedFromTotals: val })}
        />
      </div>
    </>
  );
}

function CardFields({ form, set }) {
  const { t } = useTranslation();
  return (
    <>
      <Field id="card-name" label={t('accountsPage.cardName')}>
        <Input
          id="card-name"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={t('accountsPage.cardNamePlaceholder')}
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="card-last4" label={t('accountsPage.last4')}>
          <Input
            id="card-last4"
            inputMode="numeric"
            placeholder="0000"
            value={form.last4}
            onChange={(e) =>
              set({ last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })
            }
            required
          />
        </Field>
        <Field id="card-color" label={t('accountsPage.color')}>
          <ColorInput
            id="card-color"
            value={form.color}
            onChange={(color) => set({ color })}
          />
        </Field>
      </div>
    </>
  );
}

function FormActions({ onCancel, submitLabel, busy }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
      <Button variant="outline" onClick={onCancel}>
        {t('accountsPage.cancel')}
      </Button>
      <Button
        type="submit"
        variant="custom"
        disabled={busy}
        className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] font-semibold px-4"
      >
        {submitLabel}
      </Button>
    </div>
  );
}

/** Create a bank account or card, or bring back one hidden from the list. */
export function AddAccountDialog({
  open,
  onOpenChange,
  initialTab = 'bank',
  hiddenItems,
  onRestore,
  onCreated,
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(initialTab);
  const [bank, setBank] = useState(BANK_DEFAULTS);
  const [card, setCard] = useState(CARD_DEFAULTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const tabs = [
    { id: 'bank', label: t('accountsPage.tabBankShort') },
    { id: 'card', label: t('accountsPage.tabCardShort') },
    ...(hiddenItems.length > 0
      ? [{ id: 'link', label: t('accountsPage.tabLinkShort') }]
      : []),
  ];

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === 'bank') {
        await api.post('/accounts', {
          ...bank,
          initialBalance: parseFloat(bank.initialBalance || '0'),
        });
        setBank(BANK_DEFAULTS);
        toast.success(t('accountsPage.accountAdded'));
      } else {
        await api.post('/cards', card);
        setCard(CARD_DEFAULTS);
        toast.success(t('accountsPage.cardAdded'));
      }
      onOpenChange(false);
      onCreated();
    } catch {
      toast.error(
        tab === 'bank'
          ? t('accountsPage.accountAddFailed')
          : t('accountsPage.cardAddFailed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={t('accountsPage.addAccountTitle')}
    >
      <div
        role="group"
        aria-label={t('accountsPage.addAccountTitle')}
        className="flex gap-0.5 p-0.5 mb-4 rounded-lg bg-[var(--muted)]"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'flex-1 min-h-11 sm:min-h-9 px-1 rounded-md text-[13px] transition-colors',
              tab === item.id
                ? 'bg-[var(--card)] text-[var(--foreground)] font-semibold shadow-sm'
                : 'text-[var(--muted-foreground)] font-medium',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'link' ? (
        <ul className="divide-y divide-[var(--border)]">
          {hiddenItems.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex items-center gap-3 py-2"
            >
              <span
                className="size-2.5 rounded-full flex-shrink-0"
                style={{ background: item.color }}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-[var(--foreground)] truncate">
                  {item.name}
                </span>
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {item.kind === 'card'
                    ? `•••• ${item.last4}`
                    : t('accountsPage.typeBank')}
                </span>
              </span>
              <Button
                variant="outline"
                onClick={() => onRestore(item.kind, item.id)}
              >
                {t('accountsPage.linkAction')}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {tab === 'bank' ? (
            <BankFields
              form={bank}
              set={(p) => setBank((v) => ({ ...v, ...p }))}
              withBalance
            />
          ) : (
            <CardFields
              form={card}
              set={(p) => setCard((v) => ({ ...v, ...p }))}
            />
          )}
          <FormActions
            busy={busy}
            onCancel={() => onOpenChange(false)}
            submitLabel={
              tab === 'bank'
                ? t('accountsPage.createAccount')
                : t('accountsPage.createCard')
            }
          />
        </form>
      )}
    </Shell>
  );
}

export function EditAccountDialog({ open, onOpenChange, kind, item, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(item);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm(item);
  }, [open, item]);

  const isCard = kind === 'card';
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isCard) {
        await api.put(`/cards/${item.id}`, {
          name: form.name,
          color: form.color,
          last4: form.last4,
        });
      } else {
        await api.put(`/accounts/${item.id}`, {
          name: form.name,
          color: form.color,
          isExcludedFromTotals: form.isExcludedFromTotals,
        });
      }
      toast.success(
        isCard
          ? t('accountsPage.cardUpdated')
          : t('accountsPage.accountUpdated'),
      );
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error(
        isCard
          ? t('accountsPage.cardUpdateFailed')
          : t('accountsPage.accountUpdateFailed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={
        isCard
          ? t('accountsPage.editCardTitle')
          : t('accountsPage.editAccountTitle')
      }
    >
      {form && (
        <form onSubmit={submit} className="space-y-4">
          {isCard ? (
            <CardFields
              form={form}
              set={(p) => setForm((v) => ({ ...v, ...p }))}
            />
          ) : (
            <BankFields
              form={form}
              set={(p) => setForm((v) => ({ ...v, ...p }))}
            />
          )}
          <FormActions
            busy={busy}
            onCancel={() => onOpenChange(false)}
            submitLabel={t('accountsPage.save')}
          />
        </form>
      )}
    </Shell>
  );
}

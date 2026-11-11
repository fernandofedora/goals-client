import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import DateInput from './DateInput';
import Input from './ui/input';
import Button from './ui/button';
import Select from './ui/select';
import { cn } from '../lib/utils';
import { useCurrency } from '../context/CurrencyContext';
import { categoryOptions } from '../utils/categories';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyExpense = (date = '', account = null) => ({
  description: '',
  categoryId: '',
  amount: '',
  date,
  method:
    account?.kind === 'card'
      ? 'card'
      : account?.kind === 'bank'
        ? 'account'
        : 'cash',
  cardId: account?.kind === 'card' ? String(account.id) : '',
  accountId: account?.kind === 'bank' ? String(account.id) : '',
});

const emptyIncome = (date = '', account = null) => ({
  description: '',
  categoryId: '',
  amount: '',
  date,
  incomeMethod: account?.kind === 'bank' ? 'account' : 'cash',
  accountId: account?.kind === 'bank' ? String(account.id) : '',
});

export function Field({ label, labelRight, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
        >
          {label}
        </label>
        {labelRight && labelRight}
      </div>
      {children}
    </div>
  );
}

const MinusCircle = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const PlusCircle = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

/**
 * Expense / income creation form, shared by the "Agregar transacción" page and
 * the global quick-add dialog.
 *
 * variant="page"   — the page's 3-column grid, empty date, single submit.
 * variant="dialog" — one column, date defaults to today, plus "save and add
 *                    another" so several entries can go in without reopening.
 *
 * onCreated({ addAnother }) runs after a successful POST.
 * account ({ kind: 'bank' | 'card', id }) preselects where the money moves.
 */
export default function TransactionForm({
  categories = [],
  cards = [],
  accounts = [],
  onCreated,
  variant = 'page',
  account = null,
}) {
  const { t } = useTranslation();
  const { symbol: cs } = useCurrency();
  const isDialog = variant === 'dialog';
  const initialDate = isDialog ? todayISO() : '';
  const idp = useId();
  const descRef = useRef(null);
  const addAnotherRef = useRef(false);

  const [txMode, setTxMode] = useState('expense');
  const [expense, setExpense] = useState(() =>
    emptyExpense(initialDate, account),
  );
  const [income, setIncome] = useState(() => emptyIncome(initialDate, account));
  const [submitting, setSubmitting] = useState(false);

  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');
  const current = txMode === 'expense' ? expense : income;
  const setCurrent = txMode === 'expense' ? setExpense : setIncome;
  const patch = (field) => (e) =>
    setCurrent((v) => ({ ...v, [field]: e.target.value }));

  const buildPayload = () => {
    if (txMode === 'expense') {
      return {
        ...expense,
        type: 'expense',
        paymentMethod: expense.method,
        amount: parseFloat(expense.amount || 0),
        accountId:
          expense.method === 'account' ? expense.accountId || null : null,
        cardId: expense.method === 'card' ? expense.cardId || null : null,
      };
    }
    const payload = {
      ...income,
      type: 'income',
      amount: parseFloat(income.amount || 0),
      paymentMethod: income.incomeMethod === 'account' ? 'account' : 'cash',
    };
    if (income.incomeMethod === 'cash') payload.accountId = null;
    if (account?.kind === 'card') payload.cardId = account.id;
    return payload;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const addAnother = addAnotherRef.current;
    addAnotherRef.current = false;
    setSubmitting(true);
    try {
      await api.post('/transactions', buildPayload());
      if (txMode === 'expense') {
        // Keep the payment method between entries: people log several
        // purchases with the same card in a row.
        setExpense((v) => ({
          ...emptyExpense(initialDate, account),
          ...(addAnother
            ? { method: v.method, cardId: v.cardId, accountId: v.accountId }
            : {}),
        }));
        toast.success(t('addTransaction.expenseAdded'));
      } else {
        setIncome(emptyIncome(initialDate, account));
        toast.success(t('addTransaction.incomeAdded'));
      }
      form.reset(); // Clear native browser validation state (removes :user-invalid)
      onCreated?.({ addAnother });
      if (addAnother) descRef.current?.focus();
    } catch {
      toast.error(
        txMode === 'expense'
          ? t('addTransaction.addExpenseFailed')
          : t('addTransaction.addIncomeFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fullRow = isDialog ? '' : 'sm:col-span-2 lg:col-span-3';

  return (
    <>
      {/* Tab switcher */}
      <div className={isDialog ? '' : 'px-5 pt-4'}>
        <div
          className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--muted)] p-1 gap-1"
          role="group"
          aria-label={t('transactions.type')}
        >
          {['expense', 'income'].map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={txMode === mode}
              onClick={() => setTxMode(mode)}
              className={cn(
                'min-h-11 sm:min-h-0 px-5 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer',
                txMode === mode
                  ? mode === 'expense'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {mode === 'expense' ? <MinusCircle /> : <PlusCircle />}
                {mode === 'expense'
                  ? t('transactions.expense')
                  : t('transactions.income')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form
        className={cn(
          'grid gap-4',
          isDialog
            ? 'grid-cols-1 pt-4'
            : 'p-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        )}
        onSubmit={onSubmit}
      >
        {/* Description */}
        <div className={fullRow}>
          <Field label={t('transactions.description')} htmlFor={`${idp}-desc`}>
            <Input
              ref={descRef}
              id={`${idp}-desc`}
              className="w-full"
              placeholder={
                txMode === 'expense'
                  ? t('addTransaction.descExpensePlaceholder')
                  : t('addTransaction.descIncomePlaceholder')
              }
              value={current.description}
              onChange={patch('description')}
              required
            />
          </Field>
        </div>

        <div className={isDialog ? 'grid grid-cols-2 gap-4' : 'contents'}>
          {/* Amount */}
          <Field
            label={t('addTransaction.amountLabel', { symbol: cs })}
            htmlFor={`${idp}-amount`}
          >
            <Input
              id={`${idp}-amount`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={current.amount}
              onChange={patch('amount')}
              required
            />
          </Field>

          {/* Date */}
          <Field label={t('transactions.date')} htmlFor={`${idp}-date`}>
            <DateInput
              id={`${idp}-date`}
              value={current.date}
              onChange={patch('date')}
              required
              placeholder={t('addTransaction.pickDate')}
            />
          </Field>
        </div>

        {/* Category */}
        <Field
          label={t('transactions.category')}
          labelRight={
            <Link
              to="/settings/categories"
              // py-3/-my-3: 44px touch area without growing the label row
              className="py-3 -my-3 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              {t('addTransaction.newCategory')}
            </Link>
          }
        >
          <Select
            value={current.categoryId}
            onChange={patch('categoryId')}
            required
          >
            <option value="">{t('addTransaction.selectCategory')}</option>
            {categoryOptions(
              txMode === 'expense' ? expenseCats : incomeCats,
            ).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        {/* Expense-only: 3-way payment picker + conditional card or account picker */}
        {txMode === 'expense' && (
          <>
            <Field label={t('transactions.paymentMethod')}>
              <div
                className={cn(
                  'grid grid-cols-3 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] p-0.5 gap-0.5',
                  !isDialog && 'sm:inline-flex sm:w-auto',
                )}
                role="group"
                aria-label={t('transactions.paymentMethod')}
              >
                {[
                  { val: 'cash', icon: '💵', label: t('transactions.cash') },
                  { val: 'card', icon: '💳', label: t('transactions.card') },
                  {
                    val: 'account',
                    icon: '🏦',
                    label: t('transactions.account'),
                  },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() =>
                      setExpense((v) => ({
                        ...v,
                        method: opt.val,
                        cardId: '',
                        accountId: '',
                      }))
                    }
                    aria-pressed={expense.method === opt.val}
                    className={cn(
                      'flex items-center justify-center gap-1.5 min-h-11 sm:min-h-0 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer',
                      expense.method === opt.val
                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
                    )}
                  >
                    <span aria-hidden="true">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            {expense.method === 'card' && (
              <Field label={t('addTransaction.creditCard')}>
                <Select
                  value={expense.cardId}
                  onChange={(e) =>
                    setExpense((v) => ({ ...v, cardId: e.target.value }))
                  }
                  required
                >
                  <option value="">{t('addTransaction.selectCard')}</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {expense.method === 'account' && (
              <Field label={t('addTransaction.bankAccount')}>
                <Select
                  value={expense.accountId}
                  onChange={(e) =>
                    setExpense((v) => ({ ...v, accountId: e.target.value }))
                  }
                  required
                >
                  <option value="">{t('addTransaction.selectAccount')}</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </>
        )}

        {/* Income-only: method + account */}
        {txMode === 'income' && account?.kind !== 'card' && (
          <>
            <Field label={t('addTransaction.incomeMethod')}>
              <Select
                value={income.incomeMethod}
                onChange={(e) =>
                  setIncome((v) => ({ ...v, incomeMethod: e.target.value }))
                }
              >
                <option value="cash">💵 {t('transactions.cash')}</option>
                <option value="account">🏦 {t('transactions.account')}</option>
              </Select>
            </Field>
            {income.incomeMethod === 'account' && (
              <Field label={t('transactions.account')}>
                <Select
                  value={income.accountId}
                  onChange={(e) =>
                    setIncome((v) => ({ ...v, accountId: e.target.value }))
                  }
                  required
                >
                  <option value="">{t('addTransaction.selectAccount')}</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </>
        )}

        {/* Submit */}
        <div
          className={cn(
            'flex gap-2 pt-1',
            isDialog
              ? 'flex-col-reverse sm:flex-row sm:justify-end'
              : 'justify-end',
            fullRow,
          )}
        >
          {isDialog && (
            <Button
              type="submit"
              variant="outline"
              disabled={submitting}
              onClick={() => {
                addAnotherRef.current = true;
              }}
              className="w-full sm:w-auto"
            >
              {t('quickAdd.saveAndAddAnother')}
            </Button>
          )}
          <Button
            type="submit"
            variant="custom"
            disabled={submitting}
            className={cn(
              'w-full sm:w-auto sm:px-8 font-semibold text-white',
              txMode === 'expense'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700',
            )}
          >
            {txMode === 'expense'
              ? t('addTransaction.addExpense')
              : t('addTransaction.addIncome')}
          </Button>
        </div>
      </form>
    </>
  );
}

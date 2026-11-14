import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import Button from './ui/button';
import Select from './ui/select';
import SheetDialog from './ui/sheet-dialog';
import { useCurrency } from '../context/CurrencyContext';
import { emitTransactionsChanged } from '../utils/transactionEvents';
import { intlLocale } from '../utils/dateLocale';
import { cn } from '../lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;
// Rendering thousands of rows at once freezes phones; the rest keep their
// default selection and are counted in the summary.
const MAX_SHOWN = 300;

const STATUS_TONE = {
  ok: 'text-emerald-700 dark:text-emerald-400',
  duplicate: 'text-amber-700 dark:text-amber-300',
  error: 'text-rose-700 dark:text-rose-400',
};

async function saveBlob(response, fallbackName) {
  const disposition = response.headers['content-disposition'] || '';
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function TemplateLinks() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(null);
  const download = async (demo) => {
    setBusy(demo ? 'demo' : 'empty');
    try {
      const res = await api.get('/import/template', {
        params: { demo: demo ? 1 : 0 },
        responseType: 'blob',
      });
      await saveBlob(res, demo ? 'ejemplo.xlsx' : 'plantilla.xlsx');
    } catch {
      toast.error(t('import.templateFailed'));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
      <p className="text-sm text-[var(--foreground)]">
        {t('import.templateIntro')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => download(false)}
        >
          {busy === 'empty'
            ? t('import.downloading')
            : t('import.downloadTemplate')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => download(true)}
        >
          {busy === 'demo'
            ? t('import.downloading')
            : t('import.downloadExample')}
        </Button>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        {t('import.templateHint')}
      </p>
    </div>
  );
}

function RecentImports({ targetName, onUndone }) {
  const { t } = useTranslation();
  const [batches, setBatches] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(() => {
    api
      .get('/import/batches')
      .then((res) => setBatches(res.data))
      .catch(() => setBatches([]));
  }, []);
  useEffect(load, [load]);

  const undo = async (batchId) => {
    try {
      const { data } = await api.delete(`/import/batches/${batchId}`);
      toast.success(t('import.undone', { count: data.deleted }));
      emitTransactionsChanged();
      setConfirming(null);
      load();
      onUndone?.();
    } catch {
      toast.error(t('import.undoFailed'));
    }
  };

  if (!batches?.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        {t('import.recent')}
      </h3>
      <ul className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
        {batches.map((b) => (
          <li
            key={b.importBatchId}
            className="px-3 py-2 flex items-center justify-between gap-3 text-sm"
          >
            <span className="min-w-0">
              <span className="block text-[var(--foreground)]">
                {t('import.batchLine', {
                  count: b.count,
                  target: targetName(b),
                })}
              </span>
              <span className="block text-xs text-[var(--muted-foreground)]">
                {new Date(b.importedAt).toLocaleString(intlLocale(), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </span>
            {confirming === b.importBatchId ? (
              <span className="flex flex-shrink-0 gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirming(null)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => undo(b.importBatchId)}
                >
                  {t('import.confirmUndo')}
                </Button>
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirming(b.importBatchId)}
              >
                {t('import.undo')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Upload our template, review every row, import the chosen ones, undo later. */
export default function ImportDialog({
  open,
  onOpenChange,
  accounts = [],
  cards = [],
}) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const [step, setStep] = useState('choose');
  const [target, setTarget] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep('choose');
    setFile(null);
    setFileError('');
    setPreview(null);
    setResult(null);
    setFilter('all');
  }, [open]);

  const targetName = useCallback(
    (b) => {
      if (b.AccountId)
        return (
          accounts.find((a) => a.id === b.AccountId)?.name ??
          t('import.anAccount')
        );
      if (b.CardId)
        return cards.find((c) => c.id === b.CardId)?.name ?? t('import.aCard');
      return t('import.cash');
    },
    [accounts, cards, t],
  );

  const pickFile = (picked) => {
    setFileError('');
    if (!picked) return setFile(null);
    const name = picked.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.csv')) {
      setFile(null);
      return setFileError(t('import.fileErrors.FILE_TYPE'));
    }
    if (picked.size > MAX_BYTES) {
      setFile(null);
      return setFileError(t('import.fileErrors.FILE_TOO_LARGE'));
    }
    setFile(picked);
  };

  const formFor = (extra = {}) => {
    const form = new FormData();
    form.append('target', target);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    form.append('file', file);
    return form;
  };

  const serverError = (err, fallback) => {
    const code = err?.response?.data?.code;
    return code
      ? t(`import.fileErrors.${code}`, { defaultValue: t(fallback) })
      : t(fallback);
  };

  const review = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/import/preview', formFor());
      setPreview(data);
      setSelected(
        new Set(data.rows.filter((r) => r.status === 'ok').map((r) => r.row)),
      );
      setFilter(data.summary.error ? 'error' : 'all');
      setStep('preview');
    } catch (err) {
      setFileError(serverError(err, 'import.previewFailed'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(
        '/import/commit',
        formFor({ include: JSON.stringify([...selected]) }),
      );
      setResult(data);
      setStep('done');
      emitTransactionsChanged();
    } catch (err) {
      toast.error(serverError(err, 'import.commitFailed'));
    } finally {
      setBusy(false);
    }
  };

  const undoResult = async () => {
    try {
      await api.delete(`/import/batches/${result.batchId}`);
      toast.success(t('import.undone', { count: result.imported }));
      emitTransactionsChanged();
      onOpenChange(false);
    } catch {
      toast.error(t('import.undoFailed'));
    }
  };

  const rows = useMemo(
    () =>
      (preview?.rows ?? []).filter(
        (r) => filter === 'all' || r.status === filter,
      ),
    [preview, filter],
  );
  const toggle = (row) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });

  const targetOptions = [
    ...accounts.map((a) => ({
      value: `account:${a.id}`,
      label: `${t('import.account')} · ${a.name}`,
    })),
    ...cards.map((c) => ({
      value: `card:${c.id}`,
      label: `${t('import.card')} · ${c.name}`,
    })),
    { value: 'cash', label: t('import.cash') },
  ];

  return (
    <SheetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('import.title')}
      description={
        step === 'choose'
          ? t('import.subtitle')
          : step === 'preview'
            ? t('import.previewSubtitle')
            : null
      }
      className="sm:max-w-3xl"
    >
      {step === 'choose' && (
        <div className="space-y-5">
          <TemplateLinks />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                {t('import.target')}
              </label>
              <Select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              >
                <option value="">{t('import.pickTarget')}</option>
                {targetOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="import-file"
                className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]"
              >
                {t('import.file')}
              </label>
              <input
                id="import-file"
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(e) => pickFile(e.target.files?.[0])}
                className="block w-full min-h-11 text-sm text-[var(--foreground)] file:mr-3 file:min-h-11 file:sm:min-h-9 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--muted)] file:px-3 file:text-sm file:font-medium file:text-[var(--foreground)] file:cursor-pointer cursor-pointer"
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                {t('import.fileHint')}
              </p>
            </div>
          </div>
          {fileError && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-sm text-rose-800 dark:text-rose-300"
            >
              {fileError}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              disabled={!target || !file || busy}
              onClick={review}
            >
              {busy ? t('import.reading') : t('import.review')}
            </Button>
          </div>
          <RecentImports targetName={targetName} />
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t('import.filterLabel')}
          >
            {[
              ['all', t('import.filters.all', { count: preview.rows.length })],
              ['ok', t('import.filters.ok', { count: preview.summary.ok })],
              [
                'duplicate',
                t('import.filters.duplicate', {
                  count: preview.summary.duplicate,
                }),
              ],
              [
                'error',
                t('import.filters.error', { count: preview.summary.error }),
              ],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  'min-h-11 sm:min-h-9 px-3 rounded-lg border text-sm font-medium cursor-pointer',
                  filter === key
                    ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]'
                    : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {preview.summary.duplicate > 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {t('import.duplicateHint')}
            </p>
          )}

          <ul className="max-h-[50dvh] overflow-y-auto divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {rows.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                {t('import.noRows')}
              </li>
            )}
            {rows.slice(0, MAX_SHOWN).map((r) => (
              <li
                key={r.row}
                className="px-3 py-2 flex items-start gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 cursor-pointer disabled:cursor-not-allowed accent-emerald-600"
                  checked={selected.has(r.row)}
                  disabled={r.status === 'error'}
                  onChange={() => toggle(r.row)}
                  aria-label={t('import.rowLabel', { row: r.row })}
                />
                <span className="w-10 flex-shrink-0 text-xs tabular-nums text-[var(--muted-foreground)] pt-0.5">
                  {t('import.rowNumber', { row: r.row })}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[var(--foreground)]">
                    {r.description || t('import.noDescription')}
                  </span>
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    {[
                      r.date,
                      r.categoryName ?? t('import.noCategory'),
                      r.ruleName && t('import.byRule', { name: r.ruleName }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {r.errors.length > 0 && (
                    <span className="mt-0.5 block text-xs text-rose-700 dark:text-rose-400">
                      {r.errors
                        .map((code) => t(`import.rowErrors.${code}`))
                        .join(' · ')}
                    </span>
                  )}
                </span>
                <span className="flex-shrink-0 text-right">
                  <span className="block tabular-nums text-[var(--foreground)]">
                    {r.amount != null
                      ? `${r.type === 'income' ? '+' : '−'}${money(r.amount)}`
                      : '—'}
                  </span>
                  <span
                    className={cn(
                      'block text-xs font-medium',
                      STATUS_TONE[r.status],
                    )}
                  >
                    {t(`import.status.${r.status}`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {rows.length > MAX_SHOWN && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {t('import.moreRows', { shown: MAX_SHOWN, total: rows.length })}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('choose')}
            >
              {t('import.back')}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy || selected.size === 0}
              onClick={confirm}
            >
              {busy
                ? t('import.importing')
                : t('import.importCount', { count: selected.size })}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <p className="text-base text-[var(--foreground)]">
            {t('import.done', {
              count: result.imported,
              target:
                targetOptions.find((o) => o.value === target)?.label ?? '',
            })}
          </p>
          {result.summary?.error > 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('import.doneSkipped', { count: result.summary.error })}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {result.batchId && (
              <Button type="button" variant="outline" onClick={undoResult}>
                {t('import.undoThis')}
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={() => onOpenChange(false)}
            >
              {t('import.close')}
            </Button>
          </div>
        </div>
      )}
    </SheetDialog>
  );
}

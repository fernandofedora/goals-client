import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import ConfirmDialog from '../../components/ui/confirm-dialog';
import { toast } from 'sonner';
import { useCurrency } from '../../context/CurrencyContext';
import {
  Field,
  SectionCard,
  EmptyState,
  EditIcon,
  TrashIcon,
} from '../../components/settings/shared';

export default function SettingsAccounts() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const { symbol: cs } = useCurrency();

  const [accountForm, setAccountForm] = useState({
    name: '',
    color: '#a3e635',
    initialBalance: '',
  });
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editAccountForm, setEditAccountForm] = useState({
    name: '',
    color: '#a3e635',
    initialBalance: '',
  });
  const [deleteAccountId, setDeleteAccountId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch {
      toast.error(t('settings.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const addAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', accountForm);
      setAccountForm({ name: '', color: '#a3e635', initialBalance: '' });
      setShowAccountForm(false);
      toast.success(t('settings.accounts.added'));
      load();
    } catch {
      toast.error(t('settings.accounts.addFailed'));
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      await api.delete(`/accounts/${deleteAccountId}`);
      setDeleteAccountId(null);
      toast.success(t('settings.accounts.deleted'));
      load();
    } catch {
      toast.error(t('settings.accounts.deleteFailed'));
    }
  };

  const startEditAccount = (account) => {
    setEditingAccountId(account.id);
    setEditAccountForm({
      name: account.name,
      color: account.color,
      initialBalance: account.initialBalance ?? '',
    });
  };
  const cancelEditAccount = () => setEditingAccountId(null);
  const saveEditAccount = async (id) => {
    try {
      await api.put(`/accounts/${id}`, editAccountForm);
      setEditingAccountId(null);
      toast.success(t('settings.accounts.updated'));
      load();
    } catch {
      toast.error(t('settings.accounts.updateFailed'));
    }
  };

  return (
    <>
      <ConfirmDialog
        open={deleteAccountId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteAccountId(null);
        }}
        title={t('settings.accounts.deleteTitle')}
        description={t('settings.accounts.deleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setDeleteAccountId(null)}
      />

      <SectionCard
        title={t('settings.accounts.title')}
        subtitle={t('settings.accounts.subtitle')}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAccountForm((v) => !v)}
          >
            {showAccountForm
              ? t('common.cancel')
              : t('settings.accounts.addAccount')}
          </Button>
        }
      >
        {showAccountForm && (
          <form
            className="px-5 pt-4 pb-5 border-b border-[var(--border)] flex flex-wrap gap-4 items-end"
            onSubmit={addAccount}
          >
            <Field label={t('settings.accounts.name')}>
              <Input
                placeholder={t('settings.accounts.namePlaceholder')}
                value={accountForm.name}
                onChange={(e) =>
                  setAccountForm((v) => ({ ...v, name: e.target.value }))
                }
                required
              />
            </Field>
            <Field label={t('settings.accounts.initialBalance')}>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={accountForm.initialBalance}
                onChange={(e) =>
                  setAccountForm((v) => ({
                    ...v,
                    initialBalance: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t('settings.accounts.color')}>
              <input
                className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]"
                type="color"
                value={accountForm.color}
                onChange={(e) =>
                  setAccountForm((v) => ({ ...v, color: e.target.value }))
                }
              />
            </Field>
            <div className="pb-0.5">
              <Button type="submit" variant="primary">
                {t('settings.accounts.saveAccount')}
              </Button>
            </div>
          </form>
        )}

        {accounts.length === 0 ? (
          <EmptyState message={t('settings.accounts.empty')} />
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="relative rounded-xl p-4 text-white overflow-hidden"
                style={{
                  background:
                    editingAccountId === account.id
                      ? editAccountForm.color
                      : account.color,
                }}
              >
                {/* subtle inner overlay for depth */}
                <div
                  className="absolute inset-0 bg-black/10 pointer-events-none"
                  aria-hidden
                />
                <div className="relative flex items-center justify-between gap-2">
                  {editingAccountId === account.id ? (
                    <div className="flex flex-wrap gap-2 items-end flex-1">
                      <Field label={t('settings.accounts.name')}>
                        <Input
                          className="bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm"
                          value={editAccountForm.name}
                          onChange={(e) =>
                            setEditAccountForm((v) => ({
                              ...v,
                              name: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label={t('settings.accounts.initialBalance')}>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-28 bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm"
                          value={editAccountForm.initialBalance}
                          onChange={(e) =>
                            setEditAccountForm((v) => ({
                              ...v,
                              initialBalance: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label={t('settings.accounts.color')}>
                        <input
                          className="w-9 h-9 rounded-lg border border-white/30 cursor-pointer bg-transparent [appearance:auto]"
                          type="color"
                          value={editAccountForm.color}
                          onChange={(e) =>
                            setEditAccountForm((v) => ({
                              ...v,
                              color: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <div className="flex gap-1.5 pb-0.5">
                        <button
                          type="button"
                          onClick={() => saveEditAccount(account.id)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium backdrop-blur-sm"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditAccount}
                          className="px-3 py-1.5 text-xs rounded-lg border border-white/30 text-white font-medium"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🏦</span>
                          <span className="font-semibold text-base leading-tight">
                            {account.name}
                          </span>
                        </div>
                        <p className="text-[13px] text-white/80 mt-0.5">
                          {t('settings.accounts.initial')}: {cs}
                          {parseFloat(account.initialBalance ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEditAccount(account)}
                          title={t('settings.accounts.editAccount')}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-white/80 hover:bg-white/20"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteAccountId(account.id)}
                          title={t('settings.accounts.deleteAccount')}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-white/80 hover:bg-white/20"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

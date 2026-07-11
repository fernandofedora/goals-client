import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import ConfirmDialog from '../../components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Field,
  SectionCard,
  EmptyState,
  EditIcon,
  TrashIcon,
} from '../../components/settings/shared';

export default function SettingsCards() {
  const { t } = useTranslation();
  const [cards, setCards] = useState([]);

  const [cardForm, setCardForm] = useState({
    name: '',
    color: '#0ea5e9',
    last4: '',
  });
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardForm, setEditCardForm] = useState({
    name: '',
    color: '#0ea5e9',
    last4: '',
  });
  const [deleteCardId, setDeleteCardId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/cards');
      setCards(res.data);
    } catch {
      toast.error(t('settings.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const addCard = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cards', cardForm);
      setCardForm({ name: '', color: '#0ea5e9', last4: '' });
      setShowCardForm(false);
      toast.success(t('settings.cards.added'));
      load();
    } catch {
      toast.error(t('settings.cards.addFailed'));
    }
  };

  const startEditCard = (card) => {
    setEditingCardId(card.id);
    setEditCardForm({ name: card.name, color: card.color, last4: card.last4 });
  };
  const cancelEditCard = () => setEditingCardId(null);
  const saveEditCard = async (id) => {
    try {
      await api.put(`/cards/${id}`, editCardForm);
      setEditingCardId(null);
      toast.success(t('settings.cards.updated'));
      load();
    } catch {
      toast.error(t('settings.cards.updateFailed'));
    }
  };

  const confirmDeleteCard = async () => {
    try {
      await api.delete(`/cards/${deleteCardId}`);
      setDeleteCardId(null);
      toast.success(t('settings.cards.deleted'));
      load();
    } catch {
      toast.error(t('settings.cards.deleteFailed'));
    }
  };

  return (
    <>
      <ConfirmDialog
        open={deleteCardId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteCardId(null);
        }}
        title={t('settings.cards.deleteTitle')}
        description={t('settings.cards.deleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDeleteCard}
        onCancel={() => setDeleteCardId(null)}
      />

      <SectionCard
        title={t('settings.cards.title')}
        subtitle={t('settings.cards.subtitle')}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCardForm((v) => !v)}
          >
            {showCardForm ? t('common.cancel') : t('settings.cards.addCard')}
          </Button>
        }
      >
        {showCardForm && (
          <form
            className="px-5 pt-4 pb-5 border-b border-[var(--border)] flex flex-wrap gap-4 items-end"
            onSubmit={addCard}
          >
            <Field label={t('settings.cards.cardName')}>
              <Input
                placeholder={t('settings.cards.namePlaceholder')}
                value={cardForm.name}
                onChange={(e) =>
                  setCardForm((v) => ({ ...v, name: e.target.value }))
                }
                required
              />
            </Field>
            <Field label={t('settings.cards.last4')}>
              <Input
                className="w-28"
                placeholder={t('settings.cards.last4Placeholder')}
                value={cardForm.last4}
                onChange={(e) =>
                  setCardForm((v) => ({
                    ...v,
                    last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4),
                  }))
                }
                required
              />
            </Field>
            <Field label={t('settings.cards.color')}>
              <input
                className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]"
                type="color"
                value={cardForm.color}
                onChange={(e) =>
                  setCardForm((v) => ({ ...v, color: e.target.value }))
                }
              />
            </Field>
            <div className="pb-0.5">
              <Button type="submit" variant="primary">
                {t('settings.cards.saveCard')}
              </Button>
            </div>
          </form>
        )}

        {cards.length === 0 ? (
          <EmptyState message={t('settings.cards.empty')} />
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="relative rounded-xl p-4 text-white overflow-hidden"
                style={{ background: card.color }}
              >
                <div
                  className="absolute inset-0 bg-black/10 pointer-events-none"
                  aria-hidden
                />
                <div className="relative flex items-center justify-between gap-2">
                  {editingCardId === card.id ? (
                    <div className="flex flex-wrap gap-2 items-end flex-1">
                      <Field label={t('settings.cards.name')}>
                        <Input
                          className="bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm"
                          value={editCardForm.name}
                          onChange={(e) =>
                            setEditCardForm((v) => ({
                              ...v,
                              name: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label={t('settings.cards.last4Short')}>
                        <Input
                          className="w-24 bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm"
                          value={editCardForm.last4}
                          onChange={(e) =>
                            setEditCardForm((v) => ({
                              ...v,
                              last4: e.target.value
                                .replace(/[^0-9]/g, '')
                                .slice(0, 4),
                            }))
                          }
                        />
                      </Field>
                      <Field label={t('settings.cards.color')}>
                        <input
                          className="w-9 h-9 rounded-lg border border-white/30 cursor-pointer bg-transparent [appearance:auto]"
                          type="color"
                          value={editCardForm.color}
                          onChange={(e) =>
                            setEditCardForm((v) => ({
                              ...v,
                              color: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <div className="flex gap-1.5 pb-0.5">
                        <button
                          type="button"
                          onClick={() => saveEditCard(card.id)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium backdrop-blur-sm"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditCard}
                          className="px-3 py-1.5 text-xs rounded-lg border border-white/30 text-white font-medium"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-6 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            className="w-5 h-5 text-white"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M2.25 7.5h19.5m-16.5 9h13.5A2.25 2.25 0 0021 14.25v-6A2.25 2.25 0 0018.75 6H5.25A2.25 2.25 0 003 8.25v6A2.25 2.25 0 005.25 16.5z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-base leading-tight">
                            {card.name}
                          </div>
                          <div className="text-[13px] text-white/80 tracking-widest">
                            **** **** **** {card.last4}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEditCard(card)}
                          title={t('settings.cards.editCard')}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-white/80 hover:bg-white/20"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCardId(card.id)}
                          title={t('settings.cards.deleteCard')}
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

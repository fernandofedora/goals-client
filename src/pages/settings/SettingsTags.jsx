import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../api';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import ConfirmDialog from '../../components/ui/confirm-dialog';
import {
  EditIcon,
  EmptyState,
  Field,
  IconButton,
  SectionCard,
  TrashIcon,
} from '../../components/settings/shared';

const EMPTY = { name: '', color: '#2563eb' };

// Server error codes (routes/tags.js) → messages under tags.errors.
const errorMessage = (err, t) => {
  const code = err?.response?.data?.code;
  return code
    ? t(`tags.errors.${code}`, { defaultValue: t('tags.saveFailed') })
    : t('tags.saveFailed');
};

function TagForm({ form, setForm, onSubmit, onCancel, submitLabel }) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label={t('tags.name')}>
        <Input
          value={form.name}
          maxLength={40}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={t('tags.namePlaceholder')}
          required
          autoFocus
        />
      </Field>
      <Field label={t('tags.color')}>
        <input
          type="color"
          aria-label={t('tags.color')}
          value={form.color}
          onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]"
        />
      </Field>
      <div className="flex gap-2 pb-0.5">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsTags() {
  const { t } = useTranslation();
  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState('loading');
  const [newForm, setNewForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [deleteTag, setDeleteTag] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/tags');
      setTags(data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tags', newForm);
      toast.success(t('tags.created'));
      setNewForm(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, t));
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tags/${editingId}`, editForm);
      toast.success(t('tags.updated'));
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, t));
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/tags/${deleteTag.id}`);
      toast.success(t('tags.deleted'));
      load();
    } catch {
      toast.error(t('tags.deleteFailed'));
    } finally {
      setDeleteTag(null);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={deleteTag !== null}
        onOpenChange={(o) => !o && setDeleteTag(null)}
        title={t('tags.deleteTitle')}
        description={t('tags.deleteDescription', {
          count: deleteTag?.count ?? 0,
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTag(null)}
      />
      <SectionCard
        title={t('tags.title')}
        subtitle={t('tags.subtitle')}
        action={
          !newForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewForm(EMPTY)}
            >
              {t('tags.add')}
            </Button>
          )
        }
      >
        {newForm && (
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--muted)]/40">
            <TagForm
              form={newForm}
              setForm={setNewForm}
              onSubmit={create}
              onCancel={() => setNewForm(null)}
              submitLabel={t('tags.createButton')}
            />
          </div>
        )}
        {status === 'loading' && (
          <div className="p-5 space-y-3" aria-busy="true">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-11 rounded-lg bg-[var(--muted)] animate-pulse motion-reduce:animate-none"
              />
            ))}
          </div>
        )}
        {status === 'error' && (
          <p className="p-5 text-sm text-rose-700 dark:text-rose-400">
            {t('tags.loadFailed')}
          </p>
        )}
        {status === 'ready' && tags.length === 0 && !newForm && (
          <EmptyState message={t('tags.empty')} />
        )}
        {status === 'ready' && tags.length > 0 && (
          <ul className="divide-y divide-[var(--border)]">
            {tags.map((tag) => (
              <li key={tag.id} className="px-5 py-3">
                {editingId === tag.id ? (
                  <TagForm
                    form={editForm}
                    setForm={setEditForm}
                    onSubmit={save}
                    onCancel={() => setEditingId(null)}
                    submitLabel={t('common.save')}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3 rounded-full flex-shrink-0"
                      style={{ background: tag.color }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                        {tag.name}
                      </span>
                      {tag.count > 0 ? (
                        <Link
                          to={`/transactions/add?tagId=${tag.id}`}
                          className="text-xs text-[var(--muted-foreground)] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        >
                          {t('tags.usedIn', { count: tag.count })}
                        </Link>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {t('tags.unused')}
                        </span>
                      )}
                    </span>
                    <IconButton
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditForm({ name: tag.name, color: tag.color });
                      }}
                      title={t('tags.edit', { name: tag.name })}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => setDeleteTag(tag)}
                      title={t('tags.delete', { name: tag.name })}
                      danger
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

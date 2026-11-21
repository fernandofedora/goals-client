import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../components/ui/confirm-dialog';

/**
 * Asks before a form dialog with unsaved changes closes.
 *
 * Route every close through `requestClose` (Radix `onOpenChange(false)` covers
 * the X, a click outside and Escape) and render `discardDialog` next to the
 * dialog. Without changes it closes right away.
 */
export default function useDiscardGuard({ dirty, onClose }) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);

  const requestClose = () => {
    if (dirty) setAsking(true);
    else onClose();
  };

  const discardDialog = (
    <ConfirmDialog
      open={asking}
      onOpenChange={(open) => {
        if (!open) setAsking(false);
      }}
      title={t('discardChanges.title')}
      description={t('discardChanges.description')}
      confirmText={t('discardChanges.confirm')}
      cancelText={t('discardChanges.keepEditing')}
      onCancel={() => setAsking(false)}
      onConfirm={() => {
        setAsking(false);
        onClose();
      }}
    />
  );

  return { requestClose, discardDialog };
}

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

const TOAST_ID = 'pwa-update';
// Installed apps can stay open for days; look for a new build hourly.
const CHECK_EVERY_MS = 60 * 60 * 1000;

/** Registers the service worker and offers a reload when a new build is ready. */
export default function PwaUpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => registration.update().catch(() => {}), CHECK_EVERY_MS);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast(t('pwa.updateAvailable'), {
      id: TOAST_ID,
      duration: Infinity,
      action: {
        label: t('pwa.reload'),
        onClick: () => updateServiceWorker(true),
      },
    });
  }, [needRefresh, t, updateServiceWorker]);

  return null;
}

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../../api';
import Button from '../ui/button';
import Input from '../ui/input';
import SheetDialog from '../ui/sheet-dialog';
import { translateServerError } from '../../utils/serverError';

const digitsOnly = (v) => v.replace(/\D/g, '').slice(0, 6);
const groupSecret = (s) => s.replace(/(.{4})/g, '$1 ').trim();

/** Profile › two-step sign-in: turn it on (password → scan → codes) or off. */
export default function TwoFactorSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null); // { enabled, available, recoveryCodesLeft }
  const [flow, setFlow] = useState(null); // null | 'password' | 'scan' | 'codes' | 'disable'
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [setup, setSetup] = useState(null); // { secret, qr }
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get('/user/2fa')
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus({ enabled: false, available: false }));
  }, []);
  useEffect(load, [load]);

  const close = () => {
    // The codes screen is the only time they're shown: leaving it is final.
    setFlow(null);
    setPassword('');
    setCode('');
    setUseRecovery(false);
    setSetup(null);
    setRecoveryCodes([]);
    setError('');
  };

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(translateServerError(err, t, 'profile.twoFactor.failed'));
    } finally {
      setBusy(false);
    }
  };

  const startSetup = (e) => {
    e.preventDefault();
    run(async () => {
      const { data } = await api.post('/user/2fa/setup', { password });
      setSetup(data);
      setPassword('');
      setFlow('scan');
    });
  };

  const confirmSetup = (e) => {
    e.preventDefault();
    run(async () => {
      const { data } = await api.post('/user/2fa/enable', { code });
      setRecoveryCodes(data.recoveryCodes);
      setCode('');
      setFlow('codes');
      load();
    });
  };

  const disable = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post(
        '/user/2fa/disable',
        useRecovery ? { password, recoveryCode: code } : { password, code },
      );
      toast.success(t('profile.twoFactor.disabled'));
      close();
      load();
    });
  };

  const codesText = recoveryCodes.join('\n');
  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(codesText);
      toast.success(t('profile.twoFactor.copied'));
    } catch {
      toast.error(t('profile.twoFactor.copyFailed'));
    }
  };
  const downloadCodes = () => {
    const blob = new Blob([`Goals – ${t('profile.twoFactor.codesFileTitle')}\n\n${codesText}\n`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goals-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!status) return null;

  const codeInput = (
    <Input
      aria-label={
        useRecovery ? t('auth.twoFactor.recoveryLabel') : t('auth.twoFactor.codeLabel')
      }
      placeholder={useRecovery ? 'xxxx-xxxx' : '123456'}
      inputMode={useRecovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      maxLength={useRecovery ? 9 : 6}
      value={code}
      onChange={(e) => setCode(useRecovery ? e.target.value : digitsOnly(e.target.value))}
      className="tracking-widest text-lg"
      required
    />
  );
  const errorLine = error && (
    <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
      {error}
    </p>
  );

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {status.enabled ? t('profile.twoFactor.on') : t('profile.twoFactor.off')}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {!status.available && !status.enabled
              ? t('profile.twoFactor.unavailable')
              : status.enabled
                ? t('profile.twoFactor.onDesc', { count: status.recoveryCodesLeft })
                : t('profile.twoFactor.offDesc')}
          </p>
        </div>
        {(status.enabled || status.available) && (
          <Button
            variant={status.enabled ? 'outline' : 'primary'}
            className="shrink-0 px-3 py-1.5 text-sm rounded-lg"
            onClick={() => setFlow(status.enabled ? 'disable' : 'password')}
          >
            {status.enabled ? t('profile.twoFactor.turnOff') : t('profile.twoFactor.turnOn')}
          </Button>
        )}
      </div>

      <SheetDialog
        open={flow !== null}
        onOpenChange={(open) => !open && close()}
        title={
          flow === 'disable'
            ? t('profile.twoFactor.disableTitle')
            : flow === 'codes'
              ? t('profile.twoFactor.codesTitle')
              : t('profile.twoFactor.enableTitle')
        }
      >
        {flow === 'password' && (
          <form className="space-y-3" onSubmit={startSetup}>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('profile.twoFactor.passwordHint')}
            </p>
            <Input
              type="password"
              aria-label={t('profile.currentPassword')}
              placeholder={t('profile.currentPassword')}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {errorLine}
            <Button type="submit" className="w-full py-2 rounded-lg" disabled={busy}>
              {t('profile.twoFactor.continue')}
            </Button>
          </form>
        )}

        {flow === 'scan' && setup && (
          <form className="space-y-4" onSubmit={confirmSetup}>
            <ol className="text-sm text-[var(--muted-foreground)] list-decimal pl-5 space-y-1">
              <li>{t('profile.twoFactor.step1')}</li>
              <li>{t('profile.twoFactor.step2')}</li>
            </ol>
            <img
              src={setup.qr}
              alt={t('profile.twoFactor.qrAlt')}
              width={200}
              height={200}
              className="mx-auto rounded-lg bg-white p-2"
            />
            <div className="text-center">
              <p className="text-xs text-[var(--muted-foreground)]">
                {t('profile.twoFactor.manualKey')}
              </p>
              <code className="mt-1 inline-block font-mono text-sm break-all select-all">
                {groupSecret(setup.secret)}
              </code>
            </div>
            {codeInput}
            {errorLine}
            <Button
              type="submit"
              className="w-full py-2 rounded-lg"
              disabled={busy || code.length !== 6}
            >
              {t('profile.twoFactor.confirm')}
            </Button>
          </form>
        )}

        {flow === 'codes' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('profile.twoFactor.codesHint')}
            </p>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm rounded-lg border border-[var(--border)] p-3">
              {recoveryCodes.map((c) => (
                <li key={c} className="text-center select-all">
                  {c}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 py-2 rounded-lg" onClick={copyCodes}>
                {t('profile.twoFactor.copy')}
              </Button>
              <Button variant="outline" className="flex-1 py-2 rounded-lg" onClick={downloadCodes}>
                {t('profile.twoFactor.download')}
              </Button>
            </div>
            <Button className="w-full py-2 rounded-lg" onClick={close}>
              {t('profile.twoFactor.saved')}
            </Button>
          </div>
        )}

        {flow === 'disable' && (
          <form className="space-y-3" onSubmit={disable}>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('profile.twoFactor.disableHint')}
            </p>
            <Input
              type="password"
              aria-label={t('profile.currentPassword')}
              placeholder={t('profile.currentPassword')}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {codeInput}
            <button
              type="button"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              onClick={() => {
                setUseRecovery((v) => !v);
                setCode('');
              }}
            >
              {useRecovery ? t('auth.twoFactor.useApp') : t('auth.twoFactor.useRecovery')}
            </button>
            {errorLine}
            <Button type="submit" variant="destructive" className="w-full py-2 rounded-lg" disabled={busy}>
              {t('profile.twoFactor.turnOff')}
            </Button>
          </form>
        )}
      </SheetDialog>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import { consumeExpiredNotice } from '../utils/session';
import { translateServerError } from '../utils/serverError';
import PasswordInput from '../components/auth/PasswordInput';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Second step when the account has two-step sign-in on.
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  // Shown once after an automatic logout (expired/invalid session). The flag
  // is set by forceLogout() right before the hard redirect lands here.
  useEffect(() => {
    if (consumeExpiredNotice()) {
      toast.error(t('auth.sessionExpired'));
    }
  }, [t]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.twoFactorRequired) {
        setChallenge(data.challengeToken);
        setPassword('');
        setSubmitting(false);
        return;
      }
      startSession(data);
    } catch (err) {
      setError(translateServerError(err, t, 'auth.login.failed'));
      setSubmitting(false);
    }
  };

  const startSession = (data) => {
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    navigate('/');
  };

  const backToPassword = () => {
    setChallenge(null);
    setCode('');
    setUseRecovery(false);
  };

  const onSubmitCode = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const body = useRecovery
        ? { challengeToken: challenge, recoveryCode: code }
        : { challengeToken: challenge, code };
      const { data } = await api.post('/auth/2fa/verify', body);
      startSession(data);
    } catch (err) {
      // The 5-minute challenge ran out: start over from the password.
      if (err?.response?.status === 401) backToPassword();
      setError(translateServerError(err, t, 'auth.twoFactor.failed'));
      setCode('');
      setSubmitting(false);
    }
  };

  if (challenge) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-6 border border-transparent dark:border-slate-700">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
          {t('auth.twoFactor.title')}
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {useRecovery
            ? t('auth.twoFactor.recoveryHint')
            : t('auth.twoFactor.codeHint')}
        </p>
        {error && (
          <div className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </div>
        )}
        <form className="space-y-3" onSubmit={onSubmitCode}>
          <input
            key={useRecovery ? 'recovery' : 'totp'}
            className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 tracking-widest text-lg"
            aria-label={
              useRecovery
                ? t('auth.twoFactor.recoveryLabel')
                : t('auth.twoFactor.codeLabel')
            }
            placeholder={useRecovery ? 'xxxx-xxxx' : '123456'}
            inputMode={useRecovery ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            maxLength={useRecovery ? 9 : 6}
            value={code}
            onChange={(e) =>
              setCode(
                useRecovery
                  ? e.target.value
                  : e.target.value.replace(/\D/g, '').slice(0, 6),
              )
            }
            autoFocus
            required
          />
          <button
            className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={submitting || (!useRecovery && code.length !== 6)}
          >
            {submitting ? t('auth.signingIn') : t('auth.twoFactor.verify')}
          </button>
        </form>
        <div className="flex items-center justify-between mt-3 text-sm">
          <button
            type="button"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
            onClick={() => {
              setUseRecovery((v) => !v);
              setCode('');
              setError('');
            }}
          >
            {useRecovery
              ? t('auth.twoFactor.useApp')
              : t('auth.twoFactor.useRecovery')}
          </button>
          <button
            type="button"
            className="text-gray-600 dark:text-gray-400 hover:underline"
            onClick={backToPassword}
          >
            {t('auth.twoFactor.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-6 border border-transparent dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
        {t('auth.login.title')}
      </h2>
      {error && (
        <div className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordInput
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          type="submit"
          disabled={submitting}
        >
          {submitting ? t('auth.signingIn') : t('auth.login.signIn')}
        </button>
      </form>
      <div className="flex items-center justify-between mt-3 text-sm text-gray-600 dark:text-gray-400">
        <span>
          {t('auth.login.noAccount')}{' '}
          <Link
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
            to="/register"
          >
            {t('auth.login.createOne')}
          </Link>
        </span>
        <Link
          className="text-indigo-600 dark:text-indigo-400 hover:underline"
          to="/reset-password"
        >
          {t('auth.login.forgotPassword')}
        </Link>
      </div>
    </div>
  );
}

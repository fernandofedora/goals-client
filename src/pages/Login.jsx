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
      localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(translateServerError(err, t, 'auth.login.failed'));
      setSubmitting(false);
    }
  };

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

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
  translateServerError,
  translateServerMessage,
} from '../utils/serverError';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step] = useState(token ? 2 : 1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submitEmail = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/auth/reset-start', { email });
      setMessage(translateServerMessage(data.message, t));
    } catch (err) {
      setError(translateServerError(err, t, 'auth.reset.sendFailed'));
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 8) {
      setError(t('auth.reset.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.reset.passwordsDoNotMatch'));
      return;
    }
    try {
      await api.post('/auth/reset-password', { token, password });
      setMessage(t('auth.reset.updatedRedirect'));
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(translateServerError(err, t, 'auth.reset.updateFailed'));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-6 border border-transparent dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
        {t('auth.reset.title')}
      </h2>
      {message && (
        <div className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {step === 1 && (
        <form className="space-y-3" onSubmit={submitEmail}>
          <input
            className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
            type="email"
            placeholder={t('auth.reset.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
            type="submit"
          >
            {t('auth.reset.verifyEmail')}
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="space-y-3" onSubmit={submitPassword}>
          <input
            className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
            type="password"
            placeholder={t('auth.reset.newPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
            type="password"
            placeholder={t('auth.reset.confirmPassword')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button
            className="w-full px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"
            type="submit"
          >
            {t('auth.reset.updatePassword')}
          </button>
        </form>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
        <Link
          className="text-indigo-600 dark:text-indigo-400 hover:underline"
          to="/login"
        >
          {t('auth.reset.backToLogin')}
        </Link>
      </p>
    </div>
  );
}

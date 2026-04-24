import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('verificando'); // verificando, success, error
  const [message, setMessage] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const verify = async () => {
      try {
        const { data } = await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Error al verificar la cuenta');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-8 text-center border border-transparent dark:border-slate-700">
      {status === 'verificando' && (
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300">Verificando tu cuenta...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mx-auto">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">¡Cuenta verificada!</h2>
          <p className="text-gray-600 dark:text-gray-300">{message}</p>
          <Link to="/login" className="inline-block w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            Ir al inicio de sesión
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Error de verificación</h2>
          <p className="text-red-600 dark:text-red-400">{message}</p>
          <Link to="/login" className="inline-block text-indigo-600 dark:text-indigo-400 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      )}
    </div>
  );
}

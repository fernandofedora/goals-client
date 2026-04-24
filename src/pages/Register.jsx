import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [success, setSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', { name, email, password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-8 text-center border border-transparent dark:border-slate-700">
        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Revisa tu correo!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Hemos enviado un enlace de verificación a <strong>{email}</strong>. Por favor verifica tu cuenta para poder iniciar sesión.</p>
        <Link to="/login" className="inline-block w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
          Volver al Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-6 border border-transparent dark:border-slate-700">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Create account</h2>
      {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors" type="submit">Sign Up</button>
      </form>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">Already have an account? <Link className="text-indigo-600 dark:text-indigo-400 hover:underline" to="/login">Sign in</Link></p>
    </div>
  );
}
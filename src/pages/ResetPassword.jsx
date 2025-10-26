import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submitEmail = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      const { data } = await api.post('/auth/reset-start', { email });
      if (data.exists) {
        setMessage('Cuenta encontrada. Crea una nueva contraseña.');
        setStep(2);
      } else {
        setError('No encontramos una cuenta con ese correo. Verifica tus datos.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo verificar el correo');
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    try {
      await api.post('/auth/reset', { email, password });
      setMessage('Contraseña actualizada correctamente. Puedes iniciar sesión.');
      setTimeout(()=> navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar la contraseña');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white shadow-lg rounded-xl p-6">
      <h2 className="text-2xl font-semibold mb-4">Recuperar contraseña</h2>
      {message && <div className="mb-3 text-sm text-emerald-600">{message}</div>}
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      {step === 1 && (
        <form className="space-y-3" onSubmit={submitEmail}>
          <input className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="email" placeholder="Correo electrónico" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <button className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" type="submit">Verificar correo</button>
        </form>
      )}

      {step === 2 && (
        <form className="space-y-3" onSubmit={submitPassword}>
          <input className="w-full border border-gray-300 rounded-md px-3 py-2" type="password" placeholder="Nueva contraseña" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          <input className="w-full border border-gray-300 rounded-md px-3 py-2" type="password" placeholder="Confirmar contraseña" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
          <button className="w-full px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" type="submit">Actualizar contraseña</button>
        </form>
      )}

      <p className="text-sm text-gray-600 mt-3"><Link className="text-indigo-600 hover:underline" to="/login">Volver a iniciar sesión</Link></p>
    </div>
  );
}
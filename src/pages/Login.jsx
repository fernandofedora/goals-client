import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white shadow-lg rounded-xl p-6">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        <input className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        <button className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" type="submit">Sign In</button>
      </form>
      <p className="text-sm text-gray-600 mt-3">No account? <Link className="text-indigo-600 hover:underline" to="/register">Create one</Link></p>
    </div>
  );
}
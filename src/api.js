import axios from 'axios';
import { forceLogout } from './utils/session';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const baseURL = `${API_BASE}/api`;  // ← Aquí le agregamos /api siempre

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired/invalid session handler. A 401 from any protected endpoint means the
// JWT is gone or no longer valid (the server only emits 401 for "No token" /
// "Invalid token"). We exclude /auth/* so a failed login or other auth-flow
// response can never bounce the user off the login screen.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthFlow = url.includes('/auth/');
    if (status === 401 && !isAuthFlow) {
      forceLogout();
    }
    return Promise.reject(error);
  }
);

export default api;

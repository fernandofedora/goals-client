import { useMemo } from 'react';

/**
 * Centralized hook for reading current auth state from localStorage.
 * Components should use this instead of directly accessing localStorage.
 */
export default function useAuth() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const token = localStorage.getItem('token');

  return {
    user,
    token,
    isAuthenticated: !!token,
    isSuperAdmin: user?.isSuperAdmin === true
  };
}

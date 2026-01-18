import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import SavingPlan from './pages/SavingPlan';
import Accounts from './pages/Accounts';
import Profile from './pages/Profile';
import useTheme from './hooks/useTheme';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const location = useLocation();
  const hideNavbar = ['/login','/register','/reset-password'].includes(location.pathname);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {!hideNavbar && <Navbar theme={theme} onToggleTheme={toggleTheme} />}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <ErrorBoundary key={location.pathname}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/saving-plan" element={<Navigate to="/plans/savings" replace />} />
          <Route path="/plans" element={<Navigate to="/plans/savings" replace />} />
          <Route path="/plans/savings" element={<ProtectedRoute><SavingPlan /></ProtectedRoute>} />
          <Route path="/plans/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </div>
    </div>
  );
}

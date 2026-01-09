import { NavLink, useNavigate } from 'react-router-dom';
import Button from './ui/button';
import { cn } from '../lib/utils';

export default function Navbar({ theme, onToggleTheme }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const onLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('dashboard_period');
    localStorage.removeItem('dashboard_year');
    navigate('/login');
  };
  return (
    <nav className="bg-[var(--card)] backdrop-blur border-b border-[var(--border)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <span className="text-xl font-semibold text-[var(--foreground)]">Expense Control</span>
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
                isActive
                  ? 'bg-[var(--muted)] text-[var(--foreground)] font-semibold shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )
            }
            end
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
                isActive
                  ? 'bg-[var(--muted)] text-[var(--foreground)] font-semibold shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )
            }
          >
            Transactions
          </NavLink>
          <NavLink
            to="/saving-plan"
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
                isActive
                  ? 'bg-[var(--muted)] text-[var(--foreground)] font-semibold shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )
            }
          >
            Savings Plans
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
                isActive
                  ? 'bg-[var(--muted)] text-[var(--foreground)] font-semibold shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )
            }
          >
            Profile
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
                isActive
                  ? 'bg-[var(--muted)] text-[var(--foreground)] font-semibold shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )
            }
          >
            Settings
          </NavLink>
        </div>
        <div className="flex items-center gap-3">
          {user?.name && (
            <span className="text-sm text-[var(--muted-foreground)]">
              Welcome, {user.name}
            </span>
          )}
          <Button variant="outline" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '🌙 Modo oscuro' : '☀️ Modo claro'}
          </Button>
          <Button variant="secondary" onClick={onLogout}>Logout</Button>
        </div>
      </div>
    </nav>
  );
}

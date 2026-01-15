import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Button from './ui/button';
import { cn } from '../lib/utils';

export default function Navbar({ theme, onToggleTheme }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const onLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('dashboard_period');
    localStorage.removeItem('dashboard_year');
    navigate('/login');
  };

  const NavLinks = ({ mobile = false, onItemClick }) => (
    <>
      <NavLink
        to="/"
        onClick={onItemClick}
        className={({ isActive }) =>
          cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
            mobile ? 'w-full justify-start' : '',
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
        onClick={onItemClick}
        className={({ isActive }) =>
          cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
            mobile ? 'w-full justify-start' : '',
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
        onClick={onItemClick}
        className={({ isActive }) =>
          cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
            mobile ? 'w-full justify-start' : '',
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
        onClick={onItemClick}
        className={({ isActive }) =>
          cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
            mobile ? 'w-full justify-start' : '',
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
        onClick={onItemClick}
        className={({ isActive }) =>
          cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-colors',
            mobile ? 'w-full justify-start' : '',
            isActive
              ? 'bg-[var(--muted)] text-[var(--foreground)] font-semibold shadow-sm'
              : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
          )
        }
      >
        Settings
      </NavLink>
    </>
  );

  return (
    <nav className="bg-[var(--card)] backdrop-blur border-b border-[var(--border)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 -ml-2 text-[var(--foreground)]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            )}
          </button>
          
          <span className="text-xl font-semibold text-[var(--foreground)]">Expense Control</span>
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6 ml-4">
            <NavLinks />
          </div>
        </div>

        {/* Desktop User Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user?.name && (
            <span className="text-sm text-[var(--muted-foreground)]">
              Welcome, {user.name}
            </span>
          )}
          <Button variant="outline" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '🌙' : '☀️'}
          </Button>
          <Button variant="secondary" onClick={onLogout}>Logout</Button>
        </div>

        {/* Mobile Theme Toggle (optional, keeping minimal for now, maybe just show in menu) */}
        <div className="md:hidden">
            {/* Placeholder to balance flex if needed, or maybe show user avatar? */}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--card)] p-4 space-y-4 absolute w-full shadow-lg">
          <div className="flex flex-col space-y-2">
            <NavLinks mobile onItemClick={() => setIsMenuOpen(false)} />
          </div>
          <div className="pt-4 border-t border-[var(--border)] space-y-3">
             {user?.name && (
              <div className="text-sm text-[var(--muted-foreground)] px-3">
                Welcome, {user.name}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onToggleTheme} className="flex-1 justify-center">
                {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </Button>
              <Button variant="secondary" onClick={() => { setIsMenuOpen(false); onLogout(); }} className="flex-1 justify-center">
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

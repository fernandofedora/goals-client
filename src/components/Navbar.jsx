import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

// ─── Chevron icon ─────────────────────────────────────────────────────────────
const ChevronDown = ({ open }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg" width="14" height="14"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// ─── Shield icon (Super Admin) ────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ─── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name = '', size = 30 }) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: colors[h],
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontSize: size * 0.38, fontWeight: 700, lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  );
}

// ─── Dropdown menu ────────────────────────────────────────────────────────────
function Dropdown({ label, isActive, isOpen, onToggle, children, mobile }) {
  return (
    <div className={cn('relative', mobile && 'w-full')}>
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
          mobile && 'w-full justify-between',
          isActive
            ? 'bg-[var(--muted)] text-[var(--foreground)] shadow-sm'
            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
        )}
      >
        {label}
        <ChevronDown open={isOpen} />
      </button>

      {/* Desktop dropdown panel */}
      {!mobile && isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="py-1.5">{children}</div>
        </div>
      )}

      {/* Mobile inline items */}
      {mobile && (
        <div className="mt-1 ml-3 border-l-2 border-[var(--border)] pl-3 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Dropdown item ────────────────────────────────────────────────────────────
function DropdownItem({ to, onClick, children, mobile }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'block px-4 py-2 text-sm transition-colors duration-100 rounded-md mx-1',
          mobile && 'px-3 py-1.5',
          isActive
            ? 'bg-[var(--muted)] text-[var(--foreground)] font-semibold'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
        )
      }
    >
      {children}
    </NavLink>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar({ theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const isSuperAdmin = user?.isSuperAdmin === true;

  // Close all menus when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setPlansOpen(false);
        setTxOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close submenus on route change
  useEffect(() => {
    setPlansOpen(false);
    setTxOpen(false);
    setUserMenuOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const closeAll = () => {
    setPlansOpen(false);
    setTxOpen(false);
    setUserMenuOpen(false);
    setMenuOpen(false);
  };

  const onLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('dashboard_period');
    localStorage.removeItem('dashboard_year');
    localStorage.removeItem('accounts.selectedAccountId');
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
      isActive
        ? 'bg-[var(--muted)] text-[var(--foreground)] shadow-sm'
        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
    );

  const mobileNavLinkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full',
      isActive
        ? 'bg-[var(--muted)] text-[var(--foreground)] font-semibold'
        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
    );

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 border-b border-[var(--border)]"
      style={{
        background: 'color-mix(in srgb, var(--card) 85%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-4">

          {/* ── Left: Brand ──────────────────────────────── */}
          <div className="flex items-center gap-5 shrink-0">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 -ml-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
            </button>

            <span className="font-bold text-base text-[var(--foreground)] tracking-tight leading-tight">
              Expense<br className="hidden sm:block" /><span className="sm:hidden"> </span>Control
            </span>
          </div>

          {/* ── Center: Desktop Navigation ────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass} onClick={closeAll}>
              Dashboard
            </NavLink>

            <Dropdown
              label="Transactions"
              isActive={location.pathname.startsWith('/transactions')}
              isOpen={txOpen}
              onToggle={() => { setTxOpen(v => !v); setPlansOpen(false); setUserMenuOpen(false); }}
            >
              <DropdownItem to="/transactions/budget" onClick={closeAll}>Budget</DropdownItem>
              <DropdownItem to="/transactions/add" onClick={closeAll}>Add Transaction</DropdownItem>
            </Dropdown>

            <Dropdown
              label="Plans"
              isActive={location.pathname.startsWith('/plans') || location.pathname === '/saving-plan'}
              isOpen={plansOpen}
              onToggle={() => { setPlansOpen(v => !v); setTxOpen(false); setUserMenuOpen(false); }}
            >
              <DropdownItem to="/plans/savings" onClick={closeAll}>Savings Plans</DropdownItem>
              <DropdownItem to="/plans/accounts" onClick={closeAll}>Accounts</DropdownItem>
              <DropdownItem to="/plans/scheduled-payments" onClick={closeAll}>Scheduled Payments</DropdownItem>
            </Dropdown>

            <NavLink to="/settings" className={navLinkClass} onClick={closeAll}>
              Settings
            </NavLink>

            {/* Super Admin badge */}
            {isSuperAdmin && (
              <NavLink
                to="/admin/users"
                onClick={closeAll}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-amber-500/20 text-amber-500 shadow-sm shadow-amber-500/10'
                      : 'text-amber-500/80 hover:text-amber-500 hover:bg-amber-500/10'
                  )
                }
              >
                <ShieldIcon />
                Users
              </NavLink>
            )}
          </div>

          {/* ── Right: User area ──────────────────────────── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-base"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-[var(--border)]" />

            {/* User dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => { setUserMenuOpen(v => !v); setPlansOpen(false); setTxOpen(false); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                >
                  <Avatar name={user.name} size={28} />
                  <span className="text-sm font-medium text-[var(--foreground)] max-w-[90px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown open={userMenuOpen} />
                </button>

                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-50 overflow-hidden">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-[var(--border)]">
                      <p className="text-xs font-semibold text-[var(--foreground)] truncate">{user.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{user.email}</p>
                      {isSuperAdmin && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-amber-500 text-xs font-semibold">
                          <ShieldIcon /> Super Admin
                        </span>
                      )}
                    </div>
                    <div className="py-1.5">
                      <NavLink
                        to="/profile"
                        onClick={closeAll}
                        className={() =>
                          'flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors mx-1 rounded-md'
                        }
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                        Profile
                      </NavLink>
                      {isSuperAdmin && (
                        <NavLink
                          to="/admin/users"
                          onClick={closeAll}
                          className={() =>
                            'flex items-center gap-2.5 px-4 py-2 text-sm text-amber-500 hover:bg-amber-500/10 transition-colors mx-1 rounded-md font-medium'
                          }
                        >
                          <ShieldIcon /> User Manager
                        </NavLink>
                      )}
                    </div>
                    <div className="py-1.5 border-t border-[var(--border)]">
                      <button
                        onClick={() => { closeAll(); onLogout(); }}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/5 transition-colors w-full text-left mx-1 rounded-md"
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile right: theme + avatar */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors text-base"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            {user && <Avatar name={user.name} size={30} />}
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ───────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--card)] shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            <NavLink to="/" end className={mobileNavLinkClass} onClick={closeAll}>
              Dashboard
            </NavLink>

            {/* Transactions mobile */}
            <Dropdown
              label="Transactions"
              isActive={location.pathname.startsWith('/transactions')}
              isOpen={txOpen}
              onToggle={() => setTxOpen(v => !v)}
              mobile
            >
              <DropdownItem to="/transactions/budget" onClick={closeAll} mobile>Budget</DropdownItem>
              <DropdownItem to="/transactions/add" onClick={closeAll} mobile>Add Transaction</DropdownItem>
            </Dropdown>

            {/* Plans mobile */}
            <Dropdown
              label="Plans"
              isActive={location.pathname.startsWith('/plans')}
              isOpen={plansOpen}
              onToggle={() => setPlansOpen(v => !v)}
              mobile
            >
              <DropdownItem to="/plans/savings" onClick={closeAll} mobile>Savings Plans</DropdownItem>
              <DropdownItem to="/plans/accounts" onClick={closeAll} mobile>Accounts</DropdownItem>
              <DropdownItem to="/plans/scheduled-payments" onClick={closeAll} mobile>Scheduled Payments</DropdownItem>
            </Dropdown>

            <NavLink to="/settings" className={mobileNavLinkClass} onClick={closeAll}>Settings</NavLink>
            <NavLink to="/profile" className={mobileNavLinkClass} onClick={closeAll}>Profile</NavLink>

            {isSuperAdmin && (
              <NavLink
                to="/admin/users"
                onClick={closeAll}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold w-full transition-all duration-150',
                    isActive
                      ? 'bg-amber-500/15 text-amber-500'
                      : 'text-amber-500/80 hover:bg-amber-500/10 hover:text-amber-500'
                  )
                }
              >
                <ShieldIcon /> User Manager
              </NavLink>
            )}

            <div className="pt-2 pb-1 border-t border-[var(--border)] mt-2">
              {user && (
                <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                  <Avatar name={user.name} size={32} />
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{user.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => { closeAll(); onLogout(); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/5 w-full text-left transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

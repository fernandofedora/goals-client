import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../lib/utils';
import { clearSession } from '../utils/session';
import { avatarColor, userInitials } from '../utils/avatar';
import { getPref, setPref } from '../utils/userStorage';
import LanguageSelector from './LanguageSelector';
import NavIcon from './NavIcon';
import QuickAddTransaction from './QuickAddTransaction';
import useInvestmentsAccess from '../hooks/useInvestmentsAccess';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

const COLLAPSED_PREF = 'sidebar.collapsed';
const REPORT_ISSUE_URL =
  'https://github.com/fernandofedora/goals-client/issues/new?labels=bug,user-reported&title=%5BBUG%5D+Brief+description+of+the+error&body=%23%23+Problem+Description%0A%0A%3C!--+Describe+what+happened+--%3E%0A%0A%23%23+Steps+to+Reproduce%0A%0A1.+%0A2.+%0A3.+%0A%0A%23%23+Expected+Behavior%0A%0A%3C!--+What+did+you+expect+to+happen%3F+--%3E%0A';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';
const ICON_BUTTON = cn(
  'size-11 lg:size-9 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors',
  FOCUS_RING,
);

// Typing targets where a bare "n" must stay a letter, not open quick-add.
const isTypingTarget = (el) =>
  el?.isContentEditable ||
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) ||
  el?.closest?.('[role="dialog"], [role="listbox"], [role="menu"]');

function Avatar({ name = '', size = 32 }) {
  return (
    <span
      className="flex items-center justify-center rounded-full flex-shrink-0 font-bold text-white"
      style={{
        width: size,
        height: size,
        background: avatarColor(name),
        fontSize: size * 0.38,
      }}
    >
      {userInitials(name)}
    </span>
  );
}

function BetaBadge() {
  const { t } = useTranslation();
  return (
    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
      {t('nav.beta').toUpperCase()}
    </span>
  );
}

function SidebarLink({ item, collapsed, onClick }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 h-10 rounded-lg text-sm font-medium transition-colors',
          FOCUS_RING,
          collapsed ? 'justify-center' : 'px-3',
          isActive
            ? 'bg-[var(--nav-active)] text-[var(--nav-active-foreground)] font-semibold'
            : item.admin
              ? 'text-amber-700 dark:text-amber-400 hover:bg-[var(--muted)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]',
        )
      }
    >
      <NavIcon name={item.icon} size={18} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.beta && <BetaBadge />}
    </NavLink>
  );
}

function MoreRow({ item, onNavigate }) {
  const rowClass = cn(
    'flex items-center gap-3 w-full min-h-[46px] px-2 rounded-lg text-sm font-medium text-left active:bg-[var(--muted)]',
    FOCUS_RING,
    item.danger
      ? 'text-red-600 dark:text-red-400'
      : item.admin
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-[var(--foreground)]',
  );
  const content = (
    <>
      <span
        className={
          item.danger || item.admin ? '' : 'text-[var(--muted-foreground)]'
        }
      >
        <NavIcon name={item.icon} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.beta && <BetaBadge />}
      {item.value && (
        <span className="text-[13px] font-normal text-[var(--muted-foreground)]">
          {item.value}
        </span>
      )}
    </>
  );
  if (item.to) {
    return (
      <NavLink to={item.to} onClick={onNavigate} className={rowClass}>
        {content}
      </NavLink>
    );
  }
  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={rowClass}
      >
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={item.onClick} className={rowClass}>
      {content}
    </button>
  );
}

/**
 * App frame for signed-in pages: sidebar from `lg` up, top bar with the global
 * actions, and a bottom tab bar with a "Más" sheet below `lg`.
 */
export default function AppShell({ theme, onToggleTheme, children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess: canSeeInvestments } = useInvestmentsAccess();
  const { privacyMode, togglePrivacy } = useCurrency();
  const { language, setLanguage } = useLanguage();

  const [collapsed, setCollapsed] = useState(
    () => getPref(COLLAPSED_PREF) === '1',
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const userMenuRef = useRef(null);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = user?.isSuperAdmin === true;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    setPref(COLLAPSED_PREF, next ? '1' : '0');
  };

  const onLogout = () => {
    clearSession();
    navigate('/login');
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setQuickAddOpen(true);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onDown = (e) => {
      if (!userMenuRef.current?.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const home = {
    to: '/',
    end: true,
    label: t('nav.dashboard'),
    icon: 'dashboard',
  };
  const transactions = {
    to: '/transactions/add',
    label: t('nav.transactions'),
    icon: 'transactions',
  };
  const budget = {
    to: '/transactions/budget',
    label: t('nav.budget'),
    icon: 'wallet',
  };
  const accounts = {
    to: '/plans/accounts',
    label: t('nav.accounts'),
    icon: 'landmark',
  };
  const savings = {
    to: '/plans/savings',
    label: t('nav.savings'),
    icon: 'piggy',
  };
  const scheduled = {
    to: '/plans/scheduled-payments',
    label: t('nav.scheduledPayments'),
    icon: 'calendar',
  };
  const investments = canSeeInvestments && {
    to: '/plans/investments',
    label: t('nav.investments'),
    icon: 'trending',
    beta: true,
  };
  const graphics = {
    to: '/graphics/categories',
    label: t('nav.graphics'),
    icon: 'chart',
  };
  const admin = isSuperAdmin && {
    to: '/admin/users',
    label: t('nav.userManager'),
    icon: 'shield',
    admin: true,
  };
  const settings = {
    to: '/settings',
    label: t('nav.settings'),
    icon: 'settings',
  };

  const sidebarMain = [
    home,
    transactions,
    budget,
    savings,
    accounts,
    scheduled,
    investments,
    graphics,
  ].filter(Boolean);
  const tabs = [home, transactions, budget, accounts];
  const moreSections = [
    [savings, scheduled, investments, graphics].filter(Boolean),
    [
      settings,
      { to: '/profile', label: t('nav.profile'), icon: 'user' },
      admin,
      {
        label: t('nav.language'),
        icon: 'globe',
        value: language?.startsWith('es') ? t('language.es') : t('language.en'),
        onClick: () => setLanguage(language?.startsWith('es') ? 'en' : 'es'),
      },
      {
        label: t('nav.theme'),
        icon: theme === 'dark' ? 'moon' : 'sun',
        value: theme === 'dark' ? t('nav.themeDark') : t('nav.themeLight'),
        onClick: onToggleTheme,
      },
    ].filter(Boolean),
    [
      {
        href: REPORT_ISSUE_URL,
        label: t('nav.reportIssue'),
        icon: 'link',
      },
      {
        label: t('nav.logout'),
        icon: 'logout',
        danger: true,
        onClick: onLogout,
      },
    ],
  ];
  const tabPaths = tabs.map((tab) => tab.to);
  const moreIsActive =
    moreOpen || !tabPaths.includes(location.pathname);

  const privacyLabel = privacyMode
    ? t('nav.showAmounts')
    : t('nav.hideAmounts');
  const privacyButton = (
    <button
      type="button"
      onClick={togglePrivacy}
      aria-pressed={privacyMode}
      aria-label={privacyLabel}
      title={privacyLabel}
      className={cn(
        ICON_BUTTON,
        privacyMode && 'bg-[var(--muted)] text-[var(--foreground)]',
      )}
    >
      <NavIcon name={privacyMode ? 'eyeOff' : 'eye'} size={18} />
    </button>
  );

  return (
    <div className="lg:flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col justify-between sticky top-0 h-screen flex-shrink-0 p-3 gap-3 bg-[var(--card)] border-r border-[var(--border)]',
          collapsed ? 'w-[72px]' : 'w-60',
        )}
      >
        <div className="flex flex-col gap-4 min-h-0">
          <div
            className={cn(
              'flex items-center',
              collapsed ? 'flex-col gap-2' : 'justify-between pl-3 h-10',
            )}
          >
            <Link
              to="/"
              aria-label={t('nav.home')}
              className={cn(
                'text-lg font-bold tracking-tight text-[var(--foreground)] rounded',
                FOCUS_RING,
              )}
            >
              {collapsed ? 'G' : 'Goals'}
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={
                collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')
              }
              title={
                collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')
              }
              className={ICON_BUTTON}
            >
              <NavIcon name={collapsed ? 'expand' : 'collapse'} size={18} />
            </button>
          </div>
          <nav
            aria-label={t('nav.main')}
            className="flex flex-col gap-0.5 overflow-y-auto"
          >
            {sidebarMain.map((item) => (
              <SidebarLink key={item.to} item={item} collapsed={collapsed} />
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-0.5">
          {admin && <SidebarLink item={admin} collapsed={collapsed} />}
          <SidebarLink item={settings} collapsed={collapsed} />
          <div className="h-px bg-[var(--border)] my-1" />
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label={user.name}
                className={cn(
                  'flex items-center gap-2.5 w-full h-[52px] rounded-lg hover:bg-[var(--muted)] transition-colors text-left',
                  FOCUS_RING,
                  collapsed ? 'justify-center' : 'px-2',
                )}
              >
                <Avatar name={user.name} />
                {!collapsed && (
                  <>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-[var(--foreground)] truncate">
                        {user.name}
                      </span>
                      <span className="block text-xs text-[var(--muted-foreground)] truncate">
                        {user.email}
                      </span>
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      <NavIcon name="chevrons" size={16} />
                    </span>
                  </>
                )}
              </button>
              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full left-0 mb-2 w-52 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-40"
                >
                  <NavLink
                    to="/profile"
                    role="menuitem"
                    className="flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md text-sm text-[var(--foreground)] hover:bg-[var(--muted)]"
                  >
                    <NavIcon name="user" size={16} />
                    {t('nav.profile')}
                  </NavLink>
                  <a
                    href={REPORT_ISSUE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md text-sm text-[var(--foreground)] hover:bg-[var(--muted)]"
                  >
                    <NavIcon name="link" size={16} />
                    {t('nav.reportIssue')}
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onLogout}
                    className="flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-[var(--muted)] text-left"
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <NavIcon name="logout" size={16} />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between lg:justify-end gap-1 pl-4 pr-1 lg:px-8 bg-[var(--card)] lg:bg-[var(--background)] border-b border-[var(--border)]">
          <Link
            to="/"
            aria-label={t('nav.home')}
            className={cn(
              'lg:hidden inline-flex items-center min-h-11 min-w-11 text-lg font-bold tracking-tight text-[var(--foreground)] rounded',
              FOCUS_RING,
            )}
          >
            Goals
          </Link>
          <div className="flex items-center gap-0.5 lg:gap-1">
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              title={t('nav.newTransactionAria')}
              aria-label={t('nav.newTransactionAria')}
              aria-keyshortcuts="N"
              className={cn(
                'hidden lg:inline-flex items-center gap-1.5 h-9 px-3.5 mr-1 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors',
                FOCUS_RING,
              )}
            >
              <NavIcon name="plus" size={16} />
              {t('nav.newTransaction')}
            </button>
            {privacyButton}
            <div className="hidden lg:block">
              <LanguageSelector />
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={t('nav.toggleTheme')}
              title={t('nav.toggleTheme')}
              className={cn(ICON_BUTTON, 'hidden lg:flex')}
            >
              <NavIcon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
            </button>
            {user && (
              <Link
                to="/profile"
                aria-label={t('nav.profile')}
                className={cn(
                  'lg:hidden size-11 flex items-center justify-center rounded-lg',
                  FOCUS_RING,
                )}
              >
                <Avatar name={user.name} size={30} />
              </Link>
            )}
          </div>
        </header>

        {/* Extra bottom room below lg so the tab bar and floating "+" never cover content */}
        <main className="max-w-6xl mx-auto px-4 py-6 pb-40 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile quick-add */}
      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        aria-label={t('nav.newTransactionAria')}
        className={cn(
          'lg:hidden fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 size-14 rounded-full flex items-center justify-center bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg active:scale-95 transition-transform',
          FOCUS_RING,
        )}
      >
        <NavIcon name="plus" size={24} />
      </button>

      {/* Mobile bottom tabs */}
      <nav
        aria-label={t('nav.main')}
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-0.5 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] bg-[var(--card)] border-t border-[var(--border)]"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-[54px] rounded-[10px] text-[11px] leading-tight',
                FOCUS_RING,
                isActive
                  ? 'bg-[var(--nav-active)] text-[var(--nav-active-foreground)] font-semibold'
                  : 'text-[var(--muted-foreground)] font-medium',
              )
            }
          >
            <NavIcon name={tab.icon} />
            <span className="max-w-full truncate px-0.5">{tab.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-h-[54px] rounded-[10px] text-[11px] leading-tight',
            FOCUS_RING,
            moreIsActive
              ? 'bg-[var(--nav-active)] text-[var(--nav-active-foreground)] font-semibold'
              : 'text-[var(--muted-foreground)] font-medium',
          )}
        >
          <NavIcon name="menu" />
          {t('nav.more')}
        </button>
      </nav>

      <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[20px] bg-[var(--card)] px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <Dialog.Title className="sr-only">{t('nav.more')}</Dialog.Title>
            <div className="w-9 h-1 mx-auto mb-2 rounded-full bg-[var(--border)]" />
            {user && (
              <div className="flex items-center gap-2.5 px-2 h-14">
                <Avatar name={user.name} size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            {moreSections.map((section, i) => (
              <div key={i} className="border-t border-[var(--border)] py-1">
                {section.map((item) => (
                  <MoreRow
                    key={item.label}
                    item={item}
                    onNavigate={() => setMoreOpen(false)}
                  />
                ))}
              </div>
            ))}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <QuickAddTransaction open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

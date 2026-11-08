import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import PageHeader from '../../components/ui/page-header';

const SECTIONS = [
  {
    to: '/settings/currency',
    labelKey: 'settings.sidebar.currency',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
  },
  {
    to: '/settings/accounts',
    labelKey: 'settings.sidebar.accounts',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21h18" />
        <path d="M3 10h18" />
        <path d="M5 6l7-3 7 3" />
        <path d="M4 10v11" />
        <path d="M20 10v11" />
        <path d="M8 14v3" />
        <path d="M12 14v3" />
        <path d="M16 14v3" />
      </svg>
    ),
  },
  {
    to: '/settings/categories',
    labelKey: 'settings.sidebar.categories',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 7h.01" />
        <path d="M3 6a2 2 0 0 1 2-2h6l9 9a2 2 0 0 1 0 2.8l-5.2 5.2a2 2 0 0 1-2.8 0L3 12z" />
      </svg>
    ),
  },
  {
    to: '/settings/cards',
    labelKey: 'settings.sidebar.cards',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
];

// Phones: 4 equal tabs (icon over label) so none is cut off at the edge.
// md+: vertical sidebar rows.
const sideLinkClass = ({ isActive }) =>
  cn(
    'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2.5 min-h-11 px-1 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm leading-tight font-medium text-center md:text-left transition-all duration-150 md:whitespace-nowrap',
    isActive
      ? 'bg-[var(--muted)] text-[var(--foreground)] shadow-sm'
      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]',
  );

export default function SettingsLayout() {
  const { t } = useTranslation();
  return (
    <div className="max-w-5xl mx-auto p-4">
      <PageHeader
        className="mb-5"
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* ── Section nav: vertical sidebar on desktop, pill row on mobile ── */}
        <aside className="w-full md:w-48 shrink-0 md:sticky md:top-20">
          <nav
            className="grid grid-cols-4 md:flex md:flex-col gap-1"
            aria-label={t('settings.sections')}
          >
            {SECTIONS.map((s) => (
              <NavLink key={s.to} to={s.to} className={sideLinkClass}>
                {s.icon}
                {t(s.labelKey)}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* ── Active sub-page ── */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

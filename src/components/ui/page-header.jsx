import { cn } from '../../lib/utils';

/**
 * Standard top of every page: one h1, a one-line subtitle and optional
 * actions on the right (they wrap below the title on narrow screens).
 */
export default function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
}) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-x-4 gap-y-3 flex-wrap',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] flex items-center gap-2 flex-wrap">
          {title}
          {badge}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </header>
  );
}

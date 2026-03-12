import { Toaster as Sonner } from 'sonner';

/**
 * Shadcn-style Toaster wrapper that automatically detects the current theme
 * via the data-theme attribute on <html> and passes it to sonner.
 */
export function Toaster(props) {
  // Read theme from document root (set by useTheme hook via data-theme)
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'inherit',
        },
      }}
      {...props}
    />
  );
}

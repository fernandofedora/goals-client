import { useSyncExternalStore } from 'react';

/** Live boolean for a CSS media query, e.g. useMediaQuery('(max-width: 639px)'). */
export default function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Below Tailwind's `sm` breakpoint (640px).
export const useIsMobile = () => useMediaQuery('(max-width: 639px)');

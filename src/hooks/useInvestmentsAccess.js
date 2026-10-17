import { useEffect, useState } from 'react';
import api from '../api';

/**
 * Access to the investments module (closed beta): super admins always, other
 * users only if a super admin granted it. The server enforces it on every
 * /api/investments request; this hook only decides what the UI shows.
 *
 * Starts from the user saved at login and refreshes once per page load from
 * /user/me, so a grant/revoke shows up without logging in again.
 */

const readStored = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return !!(u && (u.isSuperAdmin || u.canAccessInvestments));
  } catch {
    return false;
  }
};

// Shared /user/me promise, tied to the token it was made for: logging in as
// someone else (no page reload in the SPA) starts a fresh check.
let refresh = null;
let refreshToken = null;

function refreshAccess() {
  const token = localStorage.getItem('token');
  if (!refresh || refreshToken !== token) {
    refreshToken = token;
    refresh = api
      .get('/user/me')
      .then(({ data }) => {
        try {
          const u = JSON.parse(localStorage.getItem('user') || 'null');
          if (u) {
            localStorage.setItem(
              'user',
              JSON.stringify({
                ...u,
                canAccessInvestments: !!data.canAccessInvestments,
              }),
            );
          }
        } catch {
          /* storage unavailable — the in-memory answer still applies */
        }
        return !!(data.isSuperAdmin || data.canAccessInvestments);
      })
      .catch(() => {
        refresh = null; // retry on the next mount
        return readStored();
      });
  }
  return refresh;
}

/** @returns {{ hasAccess: boolean, checking: boolean }} */
export default function useInvestmentsAccess() {
  const [hasAccess, setHasAccess] = useState(readStored);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setChecking(false);
      return undefined;
    }
    let active = true;
    refreshAccess().then((value) => {
      if (!active) return;
      setHasAccess(value);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { hasAccess, checking };
}

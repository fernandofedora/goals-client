const line = (d) => <path key={d} d={d} />;

const ICONS = {
  dashboard: (
    <>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </>
  ),
  transactions: ['M8 3 4 7l4 4', 'M4 7h16', 'm16 21 4-4-4-4', 'M20 17H4'].map(
    line,
  ),
  wallet: [
    'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
    'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  ].map(line),
  piggy: [
    'M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z',
    'M2 9v1c0 1.1.9 2 2 2h1',
    'M16 11h.01',
  ].map(line),
  landmark: [
    'M3 22h18',
    'M6 18v-7',
    'M10 18v-7',
    'M14 18v-7',
    'M18 18v-7',
    'm12 2 8 5H4z',
  ].map(line),
  calendar: (
    <>
      {[
        'M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5',
        'M16 2v4',
        'M8 2v4',
        'M3 10h5',
        'M17.5 17.5 16 16.3V14',
      ].map(line)}
      <circle cx="16" cy="16" r="6" />
    </>
  ),
  trending: ['m22 7-8.5 8.5-5-5L2 17', 'M16 7h6v6'].map(line),
  chart: ['M3 3v16a2 2 0 0 0 2 2h16', 'm19 9-5 5-4-4-3 3'].map(line),
  shield: line('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
  settings: (
    <>
      {line(
        'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
      )}
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      {line('M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2')}
    </>
  ),
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'].map(line),
  collapse: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      {['M9 3v18', 'm16 15-3-3 3-3'].map(line)}
    </>
  ),
  expand: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      {['M9 3v18', 'm14 9 3 3-3 3'].map(line)}
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      {[
        'M12 2v2',
        'M12 20v2',
        'm4.93 4.93 1.41 1.41',
        'm17.66 17.66 1.41 1.41',
        'M2 12h2',
        'M20 12h2',
        'm6.34 17.66-1.41 1.41',
        'm19.07 4.93-1.41 1.41',
      ].map(line)}
    </>
  ),
  moon: line('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      {[
        'M2 12h20',
        'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
      ].map(line)}
    </>
  ),
  link: [
    'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
    'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  ].map(line),
  logout: [
    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
    'm16 17 5-5-5-5',
    'M21 12H9',
  ].map(line),
  eye: (
    <>
      {line('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z')}
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: [
    'M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.4 3.4',
    'M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6',
    'M9.9 9.9a3 3 0 0 0 4.2 4.2',
    'M2 2l20 20',
  ].map(line),
  plus: ['M12 5v14', 'M5 12h14'].map(line),
  chevrons: ['m7 15 5 5 5-5', 'm7 9 5-5 5 5'].map(line),
};

export default function NavIcon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      {ICONS[name]}
    </svg>
  );
}

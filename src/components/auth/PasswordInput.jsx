import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const INPUT_CLASS =
  'w-full border border-gray-300 dark:border-slate-600 rounded-md pl-3 pr-11 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300';

function EyeIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

/** Password field with a show/hide toggle, for the login, register and reset pages. */
export default function PasswordInput({ value, onChange, placeholder, autoComplete, ...rest }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        className={INPUT_CLASS}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 w-11 flex items-center justify-center rounded-r-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

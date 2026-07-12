import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Alert from '../components/ui/alert';
import { cn } from '../lib/utils';
import { intlLocale } from '../utils/dateLocale';
import { translateServerError } from '../utils/serverError';
import { avatarColor, userInitials } from '../utils/avatar';

// ── Inline field wrapper ───────────────────────────────────────────────────────
function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-rose-500 font-medium">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

// ── Password strength meter ───────────────────────────────────────────────────
function PasswordStrength({ password }) {
  const { t } = useTranslation();
  const score = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  if (!password) return null;

  const labels = [
    t('profile.strengthTooWeak'),
    t('profile.strengthWeak'),
    t('profile.strengthFair'),
    t('profile.strengthGood'),
    t('profile.strengthStrong'),
  ];
  const colors = [
    'bg-rose-500',
    'bg-orange-400',
    'bg-amber-400',
    'bg-emerald-400',
    'bg-emerald-500',
  ];
  const textColors = [
    'text-rose-500',
    'text-orange-400',
    'text-amber-500',
    'text-emerald-500',
    'text-emerald-600',
  ];

  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i <= score ? colors[score - 1] : 'bg-gray-200 dark:bg-slate-700',
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          'text-[11px] font-semibold',
          textColors[score - 1] ?? 'text-gray-400',
        )}
      >
        {labels[score - 1] ?? ''}
      </p>
    </div>
  );
}

// ── Avatar initials ───────────────────────────────────────────────────────────
// Same identity color as the navbar avatar, with a subtle depth gradient.
function Avatar({ name, size = 'lg' }) {
  const color = avatarColor(name || '');
  const initials = userInitials(name || '?') || '?';
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold select-none ring-4 ring-white dark:ring-slate-900 shadow-xl text-white',
        size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm',
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 80%, white), ${color} 60%, color-mix(in srgb, ${color} 75%, black))`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function Card({ icon, title, subtitle, accent, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] flex items-center gap-3">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-xl text-lg flex-shrink-0"
          style={
            accent
              ? { background: `${accent}18`, border: `1px solid ${accent}2e` }
              : undefined
          }
        >
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

// ── Stat item ─────────────────────────────────────────────────────────────────
function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 tabular-nums">
        {value || '—'}
      </span>
    </div>
  );
}

// ── Eye toggle icon ───────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── Password input with reveal toggle ────────────────────────────────────────
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  error,
  'aria-describedby': ariaDescribedBy,
}) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={ariaDescribedBy}
        className={cn('pr-10', error && 'border-rose-500 focus:ring-rose-500')}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        tabIndex={-1}
        aria-label={
          show ? t('profile.hidePassword') : t('profile.showPassword')
        }
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [, setInitialEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [lastLoginAt, setLastLoginAt] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [pErrors, setPErrors] = useState({});
  const [pwErrors, setPwErrors] = useState({});
  const [statusMsg, setStatusMsg] = useState(null);
  const [statusType, setStatusType] = useState('success');

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    api
      .get('/user/me')
      .then(({ data }) => {
        if (!mounted) return;
        setName(data.name || '');
        setEmail(data.email || '');
        setInitialEmail(data.email || '');
        setCreatedAt(data.createdAt || '');
        setLastLoginAt(data.lastLoginAt || '');
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-dismiss status
  useEffect(() => {
    if (!statusMsg) return;
    const timer = setTimeout(() => setStatusMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [statusMsg]);

  // ── Update profile ────────────────────────────────────────────────────────
  const onUpdateProfile = async (e) => {
    e.preventDefault();
    const emailValid = /^\S+@\S+\.\S+$/.test(email);
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = t('profile.nameRequired');
    if (!email.trim()) nextErrors.email = t('profile.emailRequired');
    else if (!emailValid) nextErrors.email = t('profile.emailInvalid');
    if (!profilePassword.trim())
      nextErrors.currentPassword = t('profile.currentPasswordRequired');
    if (Object.keys(nextErrors).length) {
      setPErrors(nextErrors);
      setStatusType('error');
      setStatusMsg(t('profile.fillRequired'));
      return;
    }
    setPErrors({});
    setSubmittingProfile(true);
    try {
      const { data } = await api.put('/user/profile', {
        name,
        email,
        currentPassword: profilePassword,
      });
      setName(data.name);
      setEmail(data.email);
      setInitialEmail(data.email);
      setProfilePassword('');
      setStatusType('success');
      setStatusMsg(t('profile.profileUpdated'));
    } catch (err) {
      setStatusType('error');
      setStatusMsg(translateServerError(err, t, 'profile.updateProfileFailed'));
    } finally {
      setSubmittingProfile(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const onChangePassword = async (e) => {
    e.preventDefault();
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword);
    const nextErrors = {};
    if (!passwordCurrent.trim())
      nextErrors.currentPassword = t('profile.currentPasswordRequired');
    if (!newPassword.trim())
      nextErrors.newPassword = t('profile.newPasswordRequired');
    else if (!strong) nextErrors.newPassword = t('profile.passwordWeak');
    if (!confirmPassword.trim())
      nextErrors.confirmPassword = t('profile.confirmRequired');
    else if (newPassword !== confirmPassword)
      nextErrors.confirmPassword = t('profile.passwordsDoNotMatch');
    if (Object.keys(nextErrors).length) {
      setPwErrors(nextErrors);
      setStatusType('error');
      setStatusMsg(t('profile.fillRequired'));
      return;
    }
    setPwErrors({});
    setSubmittingPassword(true);
    try {
      await api.post('/user/change-password', {
        currentPassword: passwordCurrent,
        newPassword,
      });
      setPasswordCurrent('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusType('success');
      setStatusMsg(t('profile.passwordChanged'));
    } catch (err) {
      setStatusType('error');
      setStatusMsg(
        translateServerError(err, t, 'profile.changePasswordFailed'),
      );
    } finally {
      setSubmittingPassword(false);
    }
  };

  const fmt = useCallback((v) => {
    if (!v) return '';
    try {
      return new Date(v).toLocaleString(intlLocale(), {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return v;
    }
  }, []);

  // Identity color — the same one the navbar avatar shows for this user.
  const heroColor = avatarColor(name);
  const memberSinceShort = createdAt
    ? new Date(createdAt).toLocaleDateString(intlLocale(), {
        month: 'short',
        year: 'numeric',
      })
    : '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-4 pb-12 space-y-5">
      {/* Feedback toast */}
      {statusMsg && (
        <Alert
          variant={statusType}
          message={statusMsg}
          onClose={() => setStatusMsg(null)}
        />
      )}

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm bg-white dark:bg-slate-900">
        {/* identity band — gradient derived from the user's avatar color */}
        <div
          className="relative h-28 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${heroColor} 70%, white) 0%, ${heroColor} 45%, color-mix(in srgb, ${heroColor} 55%, black) 100%)`,
          }}
        >
          {/* decorative translucent circles */}
          <span
            aria-hidden
            className="absolute -top-12 -left-8 w-44 h-44 rounded-full bg-white/10"
          />
          <span
            aria-hidden
            className="absolute -bottom-16 left-1/3 w-40 h-40 rounded-full bg-white/[0.07]"
          />
          {/* giant watermark initials */}
          <span
            aria-hidden
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[110px] font-black leading-none tracking-tighter text-white/15 select-none pointer-events-none"
          >
            {userInitials(name) || '✦'}
          </span>
        </div>
        {/* avatar overlapping */}
        <div className="px-6 pb-5">
          <div className="-mt-10 flex items-end gap-4 flex-wrap">
            <Avatar name={name} size="lg" />
            <div className="pb-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                {name || t('profile.yourName')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {email}
              </p>
            </div>
            {memberSinceShort && (
              <span
                className="mb-1.5 sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: `${heroColor}18`,
                  border: `1px solid ${heroColor}33`,
                  color: heroColor,
                }}
              >
                📅 {t('profile.memberSinceChip', { date: memberSinceShort })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column layout on md+ ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {/* Left: forms (wider) */}
        <div className="md:col-span-3 space-y-5">
          {/* Profile info */}
          <Card
            icon="✏️"
            accent={heroColor}
            title={t('profile.profileInfo')}
            subtitle={t('profile.profileInfoSub')}
          >
            <form className="space-y-4" onSubmit={onUpdateProfile} noValidate>
              <Field
                label={t('profile.fullName')}
                htmlFor="name"
                error={pErrors.name}
              >
                <Input
                  id="name"
                  placeholder={t('profile.fullNamePlaceholder')}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (pErrors.name)
                      setPErrors((x) => ({ ...x, name: undefined }));
                  }}
                  aria-invalid={!!pErrors.name}
                  aria-describedby={pErrors.name ? 'name-error' : undefined}
                  className={
                    pErrors.name
                      ? 'border-rose-500 focus:ring-rose-500'
                      : undefined
                  }
                />
              </Field>

              <Field
                label={t('profile.emailAddress')}
                htmlFor="email"
                error={pErrors.email}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder={t('profile.emailPlaceholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (pErrors.email)
                      setPErrors((x) => ({ ...x, email: undefined }));
                  }}
                  aria-invalid={!!pErrors.email}
                  aria-describedby={pErrors.email ? 'email-error' : undefined}
                  className={
                    pErrors.email
                      ? 'border-rose-500 focus:ring-rose-500'
                      : undefined
                  }
                />
              </Field>

              <Field
                label={t('profile.currentPassword')}
                htmlFor="profilePassword"
                error={pErrors.currentPassword}
                hint={t('profile.currentPasswordHint')}
              >
                <PasswordInput
                  id="profilePassword"
                  value={profilePassword}
                  onChange={(e) => {
                    setProfilePassword(e.target.value);
                    if (pErrors.currentPassword)
                      setPErrors((x) => ({ ...x, currentPassword: undefined }));
                  }}
                  error={pErrors.currentPassword}
                  aria-describedby={
                    pErrors.currentPassword
                      ? 'profilePassword-error'
                      : undefined
                  }
                />
              </Field>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={submittingProfile}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6"
                >
                  {submittingProfile
                    ? t('profile.saving')
                    : t('profile.saveChanges')}
                </Button>
              </div>
            </form>
          </Card>

          {/* Change password */}
          <Card
            icon="🔒"
            accent={heroColor}
            title={t('profile.changePassword')}
            subtitle={t('profile.changePasswordSub')}
          >
            <form className="space-y-4" onSubmit={onChangePassword} noValidate>
              <Field
                label={t('profile.currentPassword')}
                htmlFor="pwCurrent"
                error={pwErrors.currentPassword}
              >
                <PasswordInput
                  id="pwCurrent"
                  value={passwordCurrent}
                  onChange={(e) => {
                    setPasswordCurrent(e.target.value);
                    if (pwErrors.currentPassword)
                      setPwErrors((x) => ({
                        ...x,
                        currentPassword: undefined,
                      }));
                  }}
                  error={pwErrors.currentPassword}
                />
              </Field>

              <Field
                label={t('profile.newPassword')}
                htmlFor="pwNew"
                error={pwErrors.newPassword}
              >
                <PasswordInput
                  id="pwNew"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (pwErrors.newPassword)
                      setPwErrors((x) => ({ ...x, newPassword: undefined }));
                  }}
                  error={pwErrors.newPassword}
                />
                <PasswordStrength password={newPassword} />
              </Field>

              <Field
                label={t('profile.confirmNewPassword')}
                htmlFor="pwConfirm"
                error={pwErrors.confirmPassword}
              >
                <PasswordInput
                  id="pwConfirm"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (pwErrors.confirmPassword)
                      setPwErrors((x) => ({
                        ...x,
                        confirmPassword: undefined,
                      }));
                  }}
                  error={pwErrors.confirmPassword}
                />
                {/* match indicator */}
                {confirmPassword && newPassword && (
                  <p
                    className={cn(
                      'text-[11px] font-semibold',
                      confirmPassword === newPassword
                        ? 'text-emerald-500'
                        : 'text-rose-500',
                    )}
                  >
                    {confirmPassword === newPassword
                      ? t('profile.passwordsMatch')
                      : t('profile.passwordsNoMatch')}
                  </p>
                )}
              </Field>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={submittingPassword}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6"
                >
                  {submittingPassword
                    ? t('profile.updating')
                    : t('profile.updatePassword')}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right: account info (narrower) */}
        <div className="md:col-span-2 space-y-5">
          <Card
            icon="📋"
            accent={heroColor}
            title={t('profile.accountDetails')}
            subtitle={t('profile.accountDetailsSub')}
          >
            <div>
              <StatRow
                label={t('profile.memberSince')}
                value={fmt(createdAt)}
              />
              <StatRow
                label={t('profile.lastLogin')}
                value={fmt(lastLoginAt)}
              />
              <StatRow label={t('profile.email')} value={email} />
            </div>
          </Card>

          {/* Tips / security card — tinted with the user's identity color */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: `${heroColor}12`,
              border: `1px solid ${heroColor}30`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <h3
                className="text-sm font-semibold"
                style={{ color: heroColor }}
              >
                {t('profile.securityTips')}
              </h3>
            </div>
            <ul className="space-y-2">
              {[t('profile.tip1'), t('profile.tip2'), t('profile.tip3')].map(
                (tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300"
                  >
                    <span
                      className="mt-px opacity-60"
                      style={{ color: heroColor }}
                    >
                      •
                    </span>
                    <span>{tip}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

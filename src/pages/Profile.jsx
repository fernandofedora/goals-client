import { useEffect, useState } from 'react';
import api from '../api';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Label from '../components/ui/label';
import Alert from '../components/ui/alert';

export default function Profile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [lastLoginAt, setLastLoginAt] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [statusType, setStatusType] = useState('success');
  const [profilePassword, setProfilePassword] = useState('');
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [pErrors, setPErrors] = useState({});
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    api.get('/user/me').then(({ data }) => {
      if (!mounted) return;
      setName(data.name || '');
      setEmail(data.email || '');
      setInitialEmail(data.email || '');
      setCreatedAt(data.createdAt || '');
      setLastLoginAt(data.lastLoginAt || '');
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const onUpdateProfile = async (e) => {
    e.preventDefault();
const EMAIL_CHANGED = email !== initialEmail;
    const emailValid = /^\S+@\S+\.\S+$/.test(email);
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'El nombre es requerido';
    if (!email.trim()) nextErrors.email = 'El correo es requerido';
    else if (!emailValid) nextErrors.email = 'Formato de correo inválido';
    if (!profilePassword.trim()) nextErrors.currentPassword = 'Contraseña actual requerida para actualizar perfil';
    if (Object.keys(nextErrors).length) {
      setPErrors(nextErrors);
      setStatusType('error');
      setStatusMsg('Completa los campos requeridos');
      return;
    }
    setPErrors({});
    setSubmittingProfile(true);
    try {
      const payload = { name, email, currentPassword: profilePassword };
      const { data } = await api.put('/user/profile', payload);
      setName(data.name);
      setEmail(data.email);
      setInitialEmail(data.email);
      setStatusType('success');
      setStatusMsg('Perfil actualizado');
    } catch (err) {
      setStatusType('error');
      setStatusMsg(err.response?.data?.message || 'Error al actualizar perfil');
    } finally { setSubmittingProfile(false); }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword);
    if (!passwordCurrent.trim()) nextErrors.currentPassword = 'La contraseña actual es requerida';
    if (!newPassword.trim()) nextErrors.newPassword = 'La nueva contraseña es requerida';
    else if (!strong) nextErrors.newPassword = 'Debe tener 8+ caracteres, mayúscula, minúscula y número';
    if (!confirmPassword.trim()) nextErrors.confirmPassword = 'Confirma la nueva contraseña';
    else if (newPassword !== confirmPassword) nextErrors.confirmPassword = 'La confirmación no coincide';
    if (Object.keys(nextErrors).length) {
      setPwErrors(nextErrors);
      setStatusType('error');
      setStatusMsg('Completa los campos requeridos');
      return;
    }
    setPwErrors({});
    setSubmittingPassword(true);
    try {
      await api.post('/user/change-password', { currentPassword: passwordCurrent, newPassword });
      setPasswordCurrent('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusType('success');
      setStatusMsg('Contraseña cambiada');
    } catch (err) {
      setStatusType('error');
      setStatusMsg(err.response?.data?.message || 'Error al cambiar contraseña');
    } finally { setSubmittingPassword(false); }
  };

  const fmt = (v) => {
    if (!v) return '';
    try { return new Date(v).toLocaleString(); } catch { return v; }
  };

  const EMAIL_CHANGED = email !== initialEmail;
  const EMAIL_VALID = /^\S+@\S+\.\S+$/.test(email);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-[var(--muted-foreground)]">Manage your account information and security</p>
      </div>

      {statusMsg && (
        <Alert variant={statusType} message={statusMsg} onClose={() => setStatusMsg(null)} />
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Profile Information</span>
          <span className="text-sm text-[var(--muted-foreground)]">Update your personal information</span>
        </div>
        <form className="space-y-4" onSubmit={onUpdateProfile} noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (pErrors.name) setPErrors((x)=>({ ...x, name: undefined })); }}
              required
              aria-invalid={!!pErrors.name}
              aria-describedby="name-error"
              className={pErrors.name ? 'border-rose-500 focus:ring-rose-500' : undefined}
            />
            {pErrors.name && <div id="name-error" className="text-rose-600 text-xs">{pErrors.name}</div>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (pErrors.email) setPErrors((x)=>({ ...x, email: undefined })); }}
              required
              aria-invalid={!!pErrors.email}
              aria-describedby="email-error"
              className={pErrors.email ? 'border-rose-500 focus:ring-rose-500' : undefined}
            />
            {pErrors.email && <div id="email-error" className="text-rose-600 text-xs">{pErrors.email}</div>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={profilePassword}
              onChange={(e) => { setProfilePassword(e.target.value); if (pErrors.currentPassword) setPErrors((x)=>({ ...x, currentPassword: undefined })); }}
              required
              aria-invalid={!!pErrors.currentPassword}
              aria-describedby="currentPassword-error"
              className={pErrors.currentPassword ? 'border-rose-500 focus:ring-rose-500' : undefined}
            />
            {pErrors.currentPassword && <div id="currentPassword-error" className="text-rose-600 text-xs">{pErrors.currentPassword}</div>}
          </div>
          <Button type="submit" disabled={submittingProfile}>Update Profile</Button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Change Password</span>
          <span className="text-sm text-[var(--muted-foreground)]">Update your account password</span>
        </div>
        <form className="space-y-4" onSubmit={onChangePassword} noValidate>
          <div className="space-y-2">
            <Label htmlFor="current">Current Password</Label>
            <Input
              id="current"
              type="password"
              value={passwordCurrent}
              onChange={(e) => { setPasswordCurrent(e.target.value); if (pwErrors.currentPassword) setPwErrors((x)=>({ ...x, currentPassword: undefined })); }}
              required
              aria-invalid={!!pwErrors.currentPassword}
              aria-describedby="pwd-current-error"
              className={pwErrors.currentPassword ? 'border-rose-500 focus:ring-rose-500' : undefined}
            />
            {pwErrors.currentPassword && <div id="pwd-current-error" className="text-rose-600 text-xs">{pwErrors.currentPassword}</div>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New Password</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); if (pwErrors.newPassword) setPwErrors((x)=>({ ...x, newPassword: undefined })); }}
              required
              aria-invalid={!!pwErrors.newPassword}
              aria-describedby="pwd-new-error"
              className={pwErrors.newPassword ? 'border-rose-500 focus:ring-rose-500' : undefined}
            />
            {pwErrors.newPassword && <div id="pwd-new-error" className="text-rose-600 text-xs">{pwErrors.newPassword}</div>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (pwErrors.confirmPassword) setPwErrors((x)=>({ ...x, confirmPassword: undefined })); }}
              required
              aria-invalid={!!pwErrors.confirmPassword}
              aria-describedby="pwd-confirm-error"
              className={pwErrors.confirmPassword ? 'border-rose-500 focus:ring-rose-500' : undefined}
            />
            {pwErrors.confirmPassword && <div id="pwd-confirm-error" className="text-rose-600 text-xs">{pwErrors.confirmPassword}</div>}
          </div>
          <Button type="submit" disabled={submittingPassword}>Change Password</Button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Account Information</span>
          <span className="text-sm text-[var(--muted-foreground)]">View your account details</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Member Since</span>
            <span>{fmt(createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Last Login</span>
            <span>{fmt(lastLoginAt)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

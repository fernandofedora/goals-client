import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { toast } from 'sonner';

// ─── Icons ────────────────────────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
  </svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
);
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(name = '') {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name = '') {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const bg = avatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#fff', fontSize: size * 0.38, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {initials(name)}
      </span>
    </div>
  );
}

function Badge({ active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      color: active ? '#10b981' : '#ef4444',
      border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function RoleBadge({ isSuperAdmin }) {
  if (!isSuperAdmin) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
      border: '1px solid rgba(245,158,11,0.3)',
    }}>
      <ShieldIcon /> Super Admin
    </span>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        background: checked ? '#10b981' : 'var(--border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s',
      }} />
    </button>
  );
}

// ─── Confirmation Dialog ──────────────────────────────────────────────────────
function ConfirmDialog({ open, title, message, danger, confirmLabel = 'Confirm', onConfirm, onCancel, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onCancel} />
      <div style={{
        position: 'relative', background: 'var(--card)', borderRadius: 16,
        border: '1px solid var(--border)', padding: '28px 32px',
        width: 420, maxWidth: '90vw', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        zIndex: 1,
      }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: danger ? '#ef4444' : 'var(--foreground)' }}>{title}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>{message}</p>
        {children}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontSize: 14 }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: danger ? '#ef4444' : 'var(--primary)', color: '#fff',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Temp Password Modal ──────────────────────────────────────────────────────
function TempPasswordModal({ password, userName, onClose }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: 'var(--card)', borderRadius: 16,
        border: '1px solid var(--border)', padding: '28px 32px',
        width: 440, maxWidth: '90vw', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Temporary Password</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>Generated for {userName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4 }}><CloseIcon /></button>
        </div>

        <div style={{
          background: 'var(--muted)', borderRadius: 10, padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, border: '1px solid var(--border)',
        }}>
          <code style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, color: 'var(--foreground)', fontFamily: 'monospace' }}>
            {password}
          </code>
          <button onClick={handleCopy} style={{
            background: copied ? 'rgba(16,185,129,0.15)' : 'var(--card)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px',
            cursor: 'pointer', color: copied ? '#10b981' : 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
          }}>
            <CopyIcon />{copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f59e0b', lineHeight: 1.5,
        }}>
          ⚠️ Share this password securely. The user should change it immediately after logging in. This is a one-time display — it cannot be recovered.
        </div>

        <button onClick={onClose} style={{
          marginTop: 20, width: '100%', padding: '10px', borderRadius: 8,
          background: 'var(--muted)', border: '1px solid var(--border)',
          color: 'var(--foreground)', cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, currentUserId, onClose, onSaved }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [isActive, setIsActive] = useState(user.isActive);
  const [isSuperAdmin, setIsSuperAdmin] = useState(user.isSuperAdmin);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('general');

  const isSelf = user.id === currentUserId;

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = {};
      if (name !== user.name) updates.name = name;
      if (email !== user.email) updates.email = email;

      if (Object.keys(updates).length > 0) await api.patch(`/admin/users/${user.id}`, updates);
      if (isActive !== user.isActive) await api.patch(`/admin/users/${user.id}/status`, { isActive });
      if (isSuperAdmin !== user.isSuperAdmin) await api.patch(`/admin/users/${user.id}/promote`, { isSuperAdmin });

      toast.success('User updated successfully');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: 'var(--card)', borderRadius: 18,
        border: '1px solid var(--border)', width: 540, maxWidth: '95vw',
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={user.name} size={48} />
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: 1 }}>User Manager</p>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{user.name}</h2>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4 }}><CloseIcon /></button>
          </div>

          {/* Info strip */}
          <div style={{ display: 'flex', gap: 24, padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 20, flexWrap: 'wrap' }}>
            <span><b style={{ color: 'var(--foreground)' }}>ID:</b> {user.publicId?.slice(0, 16)}…</span>
            <span><b style={{ color: 'var(--foreground)' }}>Created:</b> {fmtDate(user.createdAt)}</span>
            <span><b style={{ color: 'var(--foreground)' }}>Last Login:</b> {fmtDate(user.lastLoginAt)}</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
            {['general', 'role'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === t ? 700 : 400,
                color: tab === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                borderBottom: tab === t ? '2px solid var(--foreground)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
                {t === 'general' ? 'General' : 'Role & Access'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 28px 28px' }}>
          {tab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>Full Name</label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, background: 'var(--muted)', border: '1px solid var(--border)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Account Status</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>Inactive users cannot log in</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{isActive ? 'Active' : 'Inactive'}</span>
                  <Toggle checked={isActive} onChange={setIsActive} disabled={isSelf} />
                </div>
              </div>
            </div>
          )}

          {tab === 'role' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: 12, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#f59e0b' }}><ShieldIcon /></span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>Super Admin</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>Full access including User Manager</p>
                  </div>
                </div>
                <Toggle checked={isSuperAdmin} onChange={setIsSuperAdmin} disabled={isSelf} />
              </div>
              {isSelf && (
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '0 4px' }}>⚠️ You cannot modify your own role or status.</p>
              )}
            </div>
          )}

          {/* Actions footer */}
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading} style={{
              padding: '9px 22px', borderRadius: 8, border: 'none',
              background: 'var(--foreground)', color: 'var(--background)',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [editUser, setEditUser] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [tempPasswordUser, setTempPasswordUser] = useState('');

  const searchTimer = useRef(null);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();

  const fetchUsers = useCallback(async (q = search, p = page, s = statusFilter, r = roleFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (q) params.set('search', q);
      if (s) params.set('status', s);
      if (r) params.set('role', r);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, page, statusFilter, roleFilter]);

  useEffect(() => { fetchUsers(); }, [page, statusFilter, roleFilter]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); fetchUsers(val, 1, statusFilter, roleFilter); }, 400);
  };

  const handleEdit = (user) => setEditUser(user);
  const handleEditSaved = () => { setEditUser(null); fetchUsers(); };

  // ── Reset Password ──
  const handleResetClick = (user) => setResetTarget(user);
  const handleResetConfirm = async () => {
    setResetting(true);
    try {
      const { data } = await api.post(`/admin/users/${resetTarget.id}/reset-password`);
      setTempPassword(data.tempPassword);
      setTempPasswordUser(resetTarget.name);
      toast.success('Password reset successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setResetting(false);
      setResetTarget(null);
    }
  };

  // ── Delete ──
  const handleDeleteClick = (user) => { setDeleteTarget(user); setDeleteConfirmText(''); };
  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== deleteTarget.name) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} has been permanently deleted`);
      setDeleteTarget(null);
      setPage(1);
      fetchUsers(search, 1, statusFilter, roleFilter);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Header ───────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ color: '#f59e0b' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>User Manager</h1>
        </div>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 14 }}>
          {total} user{total !== 1 ? 's' : ''} registered · Super Admin only
        </p>
      </div>

      {/* ── Toolbar ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }}>
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            style={{ width: '100%', padding: '9px 14px 9px 40px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: 14, cursor: 'pointer' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: 14, cursor: 'pointer' }}>
          <option value="">All Roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* ── Table ────────────────────────────────────── */}
      <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['User', 'Email', 'Status', 'Role', 'Last Login', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 14 }}>
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 14 }}>
                    No users found
                  </td>
                </tr>
              ) : users.map((u, idx) => (
                <tr key={u.id} style={{ borderBottom: idx < users.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={u.name} size={36} />
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{u.name}</p>
                        {u.id === currentUser?.id && (
                          <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>You</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{u.email}</td>
                  <td style={{ padding: '14px 16px' }}><Badge active={u.isActive} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    {u.isSuperAdmin ? <RoleBadge isSuperAdmin /> : <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>User</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmtDate(u.lastLoginAt)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEdit(u)} title="Edit user" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 12 }}>
                        <EditIcon /> Edit
                      </button>
                      <button onClick={() => handleResetClick(u)} title="Reset password" style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                        <KeyIcon />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDeleteClick(u)} title="Delete user" style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer' }}>
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
              Page {page} of {pages} · {total} total
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>
                <ChevronLeft />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1 }}>
                <ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Modal ───────────────────────────────── */}
      {editUser && (
        <EditUserModal user={editUser} currentUserId={currentUser?.id} onClose={() => setEditUser(null)} onSaved={handleEditSaved} />
      )}

      {/* ── Reset Password Confirm ───────────────────── */}
      <ConfirmDialog
        open={!!resetTarget}
        title="Reset Password"
        message={`This will generate a new temporary password for "${resetTarget?.name}". They will need to use it to log in and should change it immediately.`}
        confirmLabel={resetting ? 'Resetting…' : 'Reset Password'}
        onConfirm={handleResetConfirm}
        onCancel={() => setResetTarget(null)}
      />

      {/* ── Temp Password Display ────────────────────── */}
      {tempPassword && (
        <TempPasswordModal
          password={tempPassword}
          userName={tempPasswordUser}
          onClose={() => { setTempPassword(null); setTempPasswordUser(''); }}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="⚠️ Permanently Delete User"
        danger
        message={`This action is irreversible. It will permanently delete "${deleteTarget?.name}" and ALL their data: transactions, accounts, savings plans, categories, budgets, and scheduled payments.`}
        confirmLabel={deleting ? 'Deleting…' : 'Yes, delete permanently'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      >
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted-foreground)' }}>
            Type the user's full name to confirm: <b style={{ color: 'var(--foreground)' }}>{deleteTarget?.name}</b>
          </p>
          <input
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder={deleteTarget?.name}
            style={{ width: '100%', padding: '9px 14px', borderRadius: 8, border: `1px solid ${deleteConfirmText === deleteTarget?.name ? '#ef4444' : 'var(--border)'}`, background: 'var(--background)', color: 'var(--foreground)', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

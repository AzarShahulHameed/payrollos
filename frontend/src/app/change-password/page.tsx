'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const s = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.current)               { setError('Enter your current password'); return; }
    if (form.newPw.length < 8)       { setError('New password must be at least 8 characters'); return; }
    if (form.newPw !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.newPw === form.current) { setError('New password must be different from current password'); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.newPw });
      setSuccess(true);
      setTimeout(() => router.push(user?.role === 'EMPLOYEE' ? '/ess/dashboard' : '/dashboard'), 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 420, boxShadow: '0 4px 24px rgba(0,0,0,.08)', border: '1px solid #e3e3e6' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(145deg,#0a84ff,#0055cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 20 }}>P</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 6 }}>Change password</h1>
        <p style={{ fontSize: 13.5, color: '#6e6e73', marginBottom: 28 }}>Keep your account secure with a strong password</p>

        {success ? (
          <div style={{ background: '#e7f6ea', border: '1px solid #28a74533', borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#28a745', marginBottom: 4 }}>Password changed successfully</div>
            <div style={{ fontSize: 13, color: '#48484a' }}>Redirecting you back…</div>
          </div>
        ) : (
          <>
            {error && <div style={{ background: '#fdecea', border: '1px solid #fcc', borderRadius: 9, padding: '11px 14px', fontSize: 13.5, color: '#d83933', marginBottom: 16 }}>{error}</div>}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Current password</label>
              <input style={inp} type="password" value={form.current} onChange={e => s('current', e.target.value)} placeholder="Your current password" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>New password</label>
              <input style={inp} type="password" value={form.newPw} onChange={e => s('newPw', e.target.value)} placeholder="At least 8 characters" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Confirm new password</label>
              <input style={{ ...inp, borderColor: form.confirm && form.confirm !== form.newPw ? '#d83933' : '#d2d2d6' }}
                type="password" value={form.confirm} onChange={e => s('confirm', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="Repeat new password" />
            </div>

            {/* Password strength */}
            {form.newPw && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[
                    form.newPw.length >= 8,
                    /[A-Z]/.test(form.newPw),
                    /[0-9]/.test(form.newPw),
                    /[^A-Za-z0-9]/.test(form.newPw),
                  ].map((ok, i) => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: ok ? '#28a745' : '#e3e3e6', transition: 'background .2s' }} />
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: '#6e6e73' }}>
                  {form.newPw.length < 8 ? 'Too short' : /[A-Z]/.test(form.newPw) && /[0-9]/.test(form.newPw) && /[^A-Za-z0-9]/.test(form.newPw) ? 'Strong password' : 'Add uppercase, numbers, symbols for stronger password'}
                </div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading || !form.current || !form.newPw || !form.confirm}
              style={{ width: '100%', padding: '12px 0', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!form.current || !form.newPw || !form.confirm || loading) ? .6 : 1, marginBottom: 12 }}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
            <button onClick={() => router.back()}
              style={{ width: '100%', padding: '11px 0', background: 'transparent', color: '#6e6e73', border: 'none', borderRadius: 9, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const [form, setForm] = useState({ newPw: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (!token || !email) setError('Invalid reset link. Please request a new one.'); }, []);

  const handleSubmit = async () => {
    setError('');
    if (form.newPw.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.newPw !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, email, newPassword: form.newPw });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Invalid or expired link. Request a new one.');
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none' };

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 420, boxShadow: '0 4px 24px rgba(0,0,0,.08)', border: '1px solid #e3e3e6' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(145deg,#0a84ff,#0055cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 20 }}>P</div>

      {success ? (
        <>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e7f6ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Password reset</h1>
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: 8 }}>Your password has been updated successfully.</p>
          <p style={{ fontSize: 13, color: '#a1a1a6' }}>Redirecting to login…</p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 6 }}>Set new password</h1>
          <p style={{ fontSize: 13.5, color: '#6e6e73', marginBottom: 28 }}>Choose a strong password for your account.</p>

          {error && <div style={{ background: '#fdecea', border: '1px solid #fcc', borderRadius: 9, padding: '11px 14px', fontSize: 13.5, color: '#d83933', marginBottom: 16 }}>{error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>New password</label>
            <input style={inp} type="password" value={form.newPw} onChange={e => setForm(p => ({ ...p, newPw: e.target.value }))} placeholder="At least 8 characters" autoFocus />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Confirm password</label>
            <input style={{ ...inp, borderColor: form.confirm && form.confirm !== form.newPw ? '#d83933' : '#d2d2d6' }}
              type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="Repeat new password" />
          </div>

          <button onClick={handleSubmit} disabled={!form.newPw || !form.confirm || loading || !!(!token || !email)}
            style={{ width: '100%', padding: '12px 0', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!form.newPw || !form.confirm || loading) ? .6 : 1, marginBottom: 12 }}>
            {loading ? 'Updating…' : 'Set new password'}
          </button>
          <Link href="/login" style={{ display: 'block', textAlign: 'center', color: '#6e6e73', fontSize: 14, textDecoration: 'none' }}>Back to login</Link>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif' }}>
      <Suspense fallback={<div>Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}

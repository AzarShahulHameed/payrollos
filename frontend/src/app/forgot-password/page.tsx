'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get orgId from localStorage (set during login attempt)
  const getOrgId = () => {
    try { return JSON.parse(localStorage.getItem('payrollos-auth') || '{}')?.state?.user?.organizationId || ''; } catch { return ''; }
  };

  const handleSubmit = async () => {
    if (!email) { setError('Enter your email address'); return; }
    setLoading(true); setError('');
    try {
      // Try to find the org from email domain or use stored orgId
      await api.post('/auth/forgot-password', { email, orgId: getOrgId() });
      setSent(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Something went wrong. Try again.');
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 420, boxShadow: '0 4px 24px rgba(0,0,0,.08)', border: '1px solid #e3e3e6' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(145deg,#0a84ff,#0055cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 20 }}>P</div>

        {sent ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e7f6ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Check your email</h1>
            <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: 24 }}>
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
            </p>
            <p style={{ fontSize: 13, color: '#a1a1a6', marginBottom: 24 }}>The link expires in 1 hour.</p>
            <Link href="/login" style={{ display: 'block', textAlign: 'center', color: '#0a84ff', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Back to login
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 6 }}>Forgot password?</h1>
            <p style={{ fontSize: 13.5, color: '#6e6e73', marginBottom: 28, lineHeight: 1.5 }}>
              Enter your work email address and we'll send you a link to reset your password.
            </p>

            {error && <div style={{ background: '#fdecea', border: '1px solid #fcc', borderRadius: 9, padding: '11px 14px', fontSize: 13.5, color: '#d83933', marginBottom: 16 }}>{error}</div>}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Work email</label>
              <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="name@company.com" autoFocus />
            </div>

            <button onClick={handleSubmit} disabled={!email || loading}
              style={{ width: '100%', padding: '12px 0', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!email || loading) ? .6 : 1, marginBottom: 14 }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <Link href="/login" style={{ display: 'block', textAlign: 'center', color: '#6e6e73', fontSize: 14, textDecoration: 'none' }}>
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

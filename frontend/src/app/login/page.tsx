'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRegionStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { setRegion } = useRegionStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    orgName: '', email: '', password: '',
    firstName: '', lastName: '', region: 'UAE',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      let res: any;
      if (mode === 'login') {
        res = await authApi.login({ email: form.email, password: form.password, orgSlug: '' });
      } else {
        if (!form.orgName || !form.email || !form.password || !form.firstName || !form.lastName) {
          setError('All fields are required'); setLoading(false); return;
        }
        res = await authApi.register(form);
      }
      setAuth(res.user, res.accessToken, res.refreshToken);
      setRegion(res.user.region || 'UAE');
      router.push('/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5f7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '40px 44px',
        width: 400, boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
        border: '1px solid #e8e8ed',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.5px' }}>
            PayrollOS
          </div>
          <div style={{ fontSize: 13, color: '#86868b', marginTop: 4 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your organization'}
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', background: '#f5f5f7', borderRadius: 10,
          padding: 3, marginBottom: 24, gap: 4,
        }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
              flex: 1, padding: '7px 0', border: 'none', borderRadius: 8,
              background: mode === m ? 'white' : 'transparent',
              color: mode === m ? '#1d1d1f' : '#86868b',
              fontWeight: mode === m ? 600 : 400,
              fontSize: 13, cursor: 'pointer',
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all .15s',
            }}>
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <>
              <Field label="Company name" value={form.orgName} onChange={v => set('orgName', v)} placeholder="Acme Corp" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="First name" value={form.firstName} onChange={v => set('firstName', v)} placeholder="John" />
                <Field label="Last name" value={form.lastName} onChange={v => set('lastName', v)} placeholder="Doe" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#515154', marginBottom: 5 }}>
                  Primary region
                </label>
                <select value={form.region} onChange={e => set('region', e.target.value)} style={inputStyle}>
                  <option value="UAE">UAE</option>
                  <option value="INDIA">India</option>
                </select>
              </div>
            </>
          )}

          <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="you@company.com" />
          <Field label="Password" type="password" value={form.password} onChange={v => set('password', v)} placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'} />
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#fff2f2', borderRadius: 8, border: '1px solid #ffd0d0', fontSize: 13, color: '#c0392b' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            marginTop: 20, width: '100%', padding: '11px 0',
            background: loading ? '#86868b' : '#0071e3',
            color: 'white', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background .15s',
          }}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#86868b' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ color: '#0071e3', cursor: 'pointer', fontWeight: 500 }}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: '1px solid #d2d2d7', borderRadius: 8,
  fontSize: 13, color: '#1d1d1f', background: 'white',
  outline: 'none', boxSizing: 'border-box',
};

function Field({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#515154', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#0071e3'}
        onBlur={e => e.target.style.borderColor = '#d2d2d7'}
      />
    </div>
  );
}

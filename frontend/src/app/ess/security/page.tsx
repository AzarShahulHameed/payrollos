'use client';
import { useState } from 'react';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';
import { fieldStyle } from '@/app/settings/_components';
 
export default function ESSSecurity() {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const s = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
 
  const strength = (pw: string) => [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const strengthLabel = (pw: string) => {
    const score = strength(pw).filter(Boolean).length;
    if (score <= 1) return { label: 'Weak', color: '#d83933' };
    if (score === 2) return { label: 'Fair', color: '#c77700' };
    if (score === 3) return { label: 'Good', color: '#0a84ff' };
    return { label: 'Strong', color: '#28a745' };
  };
 
  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.current)              { setError('Enter your current password'); return; }
    if (form.newPw.length < 8)      { setError('New password must be at least 8 characters'); return; }
    if (form.newPw !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.newPw === form.current) { setError('New password must be different from current password'); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.newPw });
      setSuccess('Password updated successfully. Use your new password next time you log in.');
      setForm({ current: '', newPw: '', confirm: '' });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Incorrect current password. Please try again.');
    } finally { setLoading(false); }
  };
 
  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 13px',
    border: '1px solid var(--line-2)', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', outline: 'none',
    background: 'var(--surface)', color: 'var(--ink)',
  };
 
  const sl = form.newPw ? strengthLabel(form.newPw) : null;
 
  return (
    <ESSLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--ink)' }}>Security</h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 4 }}>Keep your account safe with a strong password</p>
      </div>
 
      <div style={{ maxWidth: 520 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 28 }}>
 
          {/* Status messages */}
          {error && (
            <div style={{ background:'#fdecea', border:'1px solid #fcc', borderRadius:9, padding:'11px 14px', fontSize:13.5, color:'#d83933', marginBottom:20 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background:'#e7f6ea', border:'1px solid #28a74533', borderRadius:9, padding:'11px 14px', fontSize:13.5, color:'#28a745', fontWeight:500, marginBottom:20 }}>
              {success}
            </div>
          )}
 
          <div style={{ marginBottom: 18 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:7 }}>
              Current password
            </label>
            <input style={inp} type="password" value={form.current} onChange={e => s('current', e.target.value)} placeholder="Your current password" />
          </div>
 
          <div style={{ marginBottom: 18 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:7 }}>
              New password
            </label>
            <input style={inp} type="password" value={form.newPw} onChange={e => s('newPw', e.target.value)} placeholder="At least 8 characters" />
            {form.newPw && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                  {strength(form.newPw).map((ok, i) => (
                    <div key={i} style={{ flex:1, height:4, borderRadius:2, background: ok ? sl?.color : 'var(--line-2)', transition:'background .2s' }} />
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12.5, fontWeight:600, color: sl?.color }}>{sl?.label}</span>
                  <span style={{ fontSize:12, color:'var(--ink-3)' }}>
                    {form.newPw.length < 8 ? '— minimum 8 characters'
                      : !(/[A-Z]/.test(form.newPw)) ? '— add uppercase letters'
                      : !(/[0-9]/.test(form.newPw)) ? '— add numbers'
                      : !(/[^A-Za-z0-9]/.test(form.newPw)) ? '— add symbols for stronger password'
                      : '— great password!'}
                  </span>
                </div>
              </div>
            )}
          </div>
 
          <div style={{ marginBottom: 28 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:7 }}>
              Confirm new password
            </label>
            <input
              style={{ ...inp, borderColor: form.confirm && form.confirm !== form.newPw ? '#d83933' : 'var(--line-2)' }}
              type="password" value={form.confirm} onChange={e => s('confirm', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Type new password again" />
            {form.confirm && form.confirm !== form.newPw && (
              <div style={{ fontSize:12.5, color:'#d83933', marginTop:5 }}>Passwords do not match</div>
            )}
            {form.confirm && form.confirm === form.newPw && form.newPw && (
              <div style={{ fontSize:12.5, color:'#28a745', marginTop:5 }}>Passwords match</div>
            )}
          </div>
 
          <button
            onClick={handleSubmit}
            disabled={loading || !form.current || !form.newPw || !form.confirm || form.newPw !== form.confirm}
            style={{ width:'100%', padding:'11px 0', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:(!form.current||!form.newPw||!form.confirm||form.newPw!==form.confirm||loading)?.6:1 }}>
            {loading ? 'Updating password…' : 'Update password'}
          </button>
        </div>
 
        {/* Security tips */}
        <div style={{ marginTop:16, background:'var(--bg)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 18px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:10 }}>Security tips</div>
          {[
            'Use at least 8 characters with a mix of letters, numbers and symbols',
            'Never share your password with anyone, including HR staff',
            'Use a unique password — do not reuse passwords from other sites',
            'If you think your account is compromised, change your password immediately',
          ].map((tip, i) => (
            <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:13, color:'var(--ink-3)', lineHeight:1.5 }}>
              <span style={{ color:'#0a84ff', flexShrink:0, marginTop:1 }}>—</span>
              {tip}
            </div>
          ))}
        </div>
      </div>
    </ESSLayout>
  );
}
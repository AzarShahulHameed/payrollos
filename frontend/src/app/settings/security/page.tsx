'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SettingsLayout, Card, SectionTitle, fieldStyle } from '../_components';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function SecuritySettings() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [pwForm, setPwForm]   = useState({ current:'', newPw:'', confirm:'' });
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk]       = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [qrData, setQrData]     = useState('');
  const [otpStep, setOtpStep]   = useState<'idle'|'scan'|'verify'|'done'>('idle');
  const [otpToken, setOtpToken] = useState('');
  const [otpError, setOtpError] = useState('');
  const [disablePw, setDisablePw] = useState('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  const { data: me } = useQuery({
    queryKey:['me-2fa'],
    queryFn: () => api.get('/auth/me').then(r => { setTwoFaEnabled(r.data.twoFaEnabled||false); return r.data; }),
  });

  const s = (k:string,v:string) => setPwForm(p=>({...p,[k]:v}));
  const strength = (pw:string) => [pw.length>=8,/[A-Z]/.test(pw),/[0-9]/.test(pw),/[^A-Za-z0-9]/.test(pw)];

  const handleChangePw = async () => {
    setPwError(''); setPwOk('');
    if (!pwForm.current)                { setPwError('Enter your current password'); return; }
    if (pwForm.newPw.length < 8)        { setPwError('New password must be at least 8 characters'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    if (pwForm.newPw === pwForm.current) { setPwError('New password must differ from current'); return; }
    setPwLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwOk('Password updated successfully');
      setPwForm({ current:'', newPw:'', confirm:'' });
    } catch(e:any) { setPwError(e?.response?.data?.message || 'Incorrect current password'); }
    finally { setPwLoading(false); }
  };

  const handle2FASetup = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrData(res.data.qrCode);
      setOtpStep('scan');
    } catch(e:any) { alert(e?.response?.data?.message||'Setup failed'); }
  };

  const handle2FAVerify = async () => {
    setOtpError('');
    try {
      await api.post('/auth/2fa/verify', { token: otpToken, enable: true });
      setTwoFaEnabled(true);
      setOtpStep('done');
    } catch(e:any) { setOtpError(e?.response?.data?.message||'Invalid code'); }
  };

  const handle2FADisable = async () => {
    if (!disablePw) { alert('Enter your password to disable 2FA'); return; }
    try {
      await api.post('/auth/2fa/disable', { password: disablePw });
      setTwoFaEnabled(false);
      setDisablePw('');
      setOtpStep('idle');
    } catch(e:any) { alert(e?.response?.data?.message||'Incorrect password'); }
  };

  const inp = fieldStyle;

  return (
    <SettingsLayout title="Security" subtitle="Manage your password and two-factor authentication">

      {/* Change password */}
      <Card>
        <SectionTitle>Change password</SectionTitle>
        {pwError && <div style={{ background:'#fdecea', border:'1px solid #fcc', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'#d83933', marginBottom:16 }}>{pwError}</div>}
        {pwOk    && <div style={{ background:'#e7f6ea', border:'1px solid #28a74533', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'#28a745', fontWeight:500, marginBottom:16 }}>{pwOk}</div>}
        <div style={{ maxWidth:480 }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Current password</label>
            <input style={inp} type="password" value={pwForm.current} onChange={e=>s('current',e.target.value)} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>New password</label>
            <input style={inp} type="password" value={pwForm.newPw} onChange={e=>s('newPw',e.target.value)} placeholder="At least 8 characters" />
            {pwForm.newPw && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:'flex', gap:4, marginBottom:5 }}>
                  {strength(pwForm.newPw).map((ok,i)=><div key={i} style={{ flex:1, height:3, borderRadius:2, background:ok?'#28a745':'var(--line-2)', transition:'background .2s' }} />)}
                </div>
                <div style={{ fontSize:12, color:'var(--ink-3)' }}>{strength(pwForm.newPw).every(Boolean)?'Strong password':'Add uppercase, numbers and symbols'}</div>
              </div>
            )}
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Confirm new password</label>
            <input style={{ ...inp, borderColor:pwForm.confirm&&pwForm.confirm!==pwForm.newPw?'#d83933':'var(--line-2)' }}
              type="password" value={pwForm.confirm} onChange={e=>s('confirm',e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleChangePw()} />
          </div>
          <button onClick={handleChangePw} disabled={pwLoading||!pwForm.current||!pwForm.newPw||!pwForm.confirm}
            style={{ padding:'9px 22px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:pwLoading?.6:1 }}>
            {pwLoading?'Updating…':'Update password'}
          </button>
        </div>
      </Card>

      {/* 2FA */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Two-factor authentication</div>
            <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:3 }}>Add an extra layer of security using Google Authenticator or similar app</div>
          </div>
          <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:999, background:twoFaEnabled?'#e7f6ea':'#f2f2f7', color:twoFaEnabled?'#28a745':'#6e6e73' }}>
            {twoFaEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {!twoFaEnabled && otpStep==='idle' && (
          <button onClick={handle2FASetup}
            style={{ padding:'9px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Set up 2FA
          </button>
        )}

        {otpStep==='scan' && (
          <div>
            <p style={{ fontSize:13.5, color:'var(--ink-2)', marginBottom:16, lineHeight:1.6 }}>
              Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app. Then enter the 6-digit code below.
            </p>
            <img src={qrData} alt="QR Code" style={{ width:200, height:200, display:'block', marginBottom:16, border:'1px solid var(--line)', borderRadius:10 }} />
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', maxWidth:340 }}>
              <div style={{ flex:1 }}>
                <input style={{ ...inp, fontSize:20, letterSpacing:'.1em', textAlign:'center', fontVariantNumeric:'tabular-nums' }}
                  value={otpToken} onChange={e=>setOtpToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="000000" maxLength={6} />
                {otpError && <div style={{ fontSize:12.5, color:'#d83933', marginTop:5 }}>{otpError}</div>}
              </div>
              <button onClick={handle2FAVerify} disabled={otpToken.length!==6}
                style={{ padding:'9px 18px', background:'#28a745', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:otpToken.length!==6?.5:1, whiteSpace:'nowrap' }}>
                Verify & enable
              </button>
            </div>
            <button onClick={()=>setOtpStep('idle')} style={{ marginTop:10, fontSize:13, color:'var(--ink-3)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          </div>
        )}

        {otpStep==='done' && (
          <div style={{ background:'#e7f6ea', border:'1px solid #28a74533', borderRadius:9, padding:'12px 16px', fontSize:13.5, color:'#28a745', fontWeight:500 }}>
            2FA enabled successfully. You will be asked for a code on next login.
          </div>
        )}

        {twoFaEnabled && (
          <div style={{ marginTop:16 }}>
            <p style={{ fontSize:13, color:'var(--ink-3)', marginBottom:10 }}>To disable 2FA, enter your password:</p>
            <div style={{ display:'flex', gap:10, maxWidth:340 }}>
              <input style={inp} type="password" value={disablePw} onChange={e=>setDisablePw(e.target.value)} placeholder="Your password" />
              <button onClick={handle2FADisable} disabled={!disablePw}
                style={{ padding:'9px 18px', background:'#d83933', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:!disablePw?.6:1, whiteSpace:'nowrap' }}>
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </Card>

      <div style={{ background:'var(--bg)', border:'1px solid var(--line)', borderRadius:10, padding:'14px 18px', fontSize:13, color:'var(--ink-3)', lineHeight:1.6 }}>
        Use a strong unique password. 2FA adds significant protection — recommended for all admin accounts.
        Never share your password or 2FA codes with anyone.
      </div>
    </SettingsLayout>
  );
}

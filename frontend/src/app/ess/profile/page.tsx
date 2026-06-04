'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { uploadToCloudinary } from '@/lib/cloudinary';

// ── PIN gate for sensitive sections ──────────────────────────
function SensitiveSection({ title, description, children }: { title:string; description:string; children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setErr('');
    setLoading(true);
    try {
      await api.post('/auth/verify-password', { password: pw });
      setUnlocked(true);
    } catch { setErr('Incorrect password'); }
    finally { setLoading(false); }
  };

  if (unlocked) return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:22, marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', textTransform:'uppercase', letterSpacing:'.04em' }}>{title}</div>
        <button onClick={()=>{ setUnlocked(false); setPw(''); }}
          style={{ fontSize:12, color:'var(--ink-3)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' }}>
          Lock
        </button>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:22, marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#e8f1fe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>{title}</div>
          <div style={{ fontSize:13, color:'var(--ink-3)' }}>{description}</div>
        </div>
      </div>
      <div style={{ marginTop:16, display:'flex', gap:10, alignItems:'flex-start', maxWidth:360 }}>
        <div style={{ flex:1 }}>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&verify()}
            placeholder="Enter your password to view"
            style={{ width:'100%', padding:'9px 12px', border:`1px solid ${err?'#d83933':'var(--line-2)'}`, borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none', background:'var(--surface)', color:'var(--ink)' }} />
          {err && <div style={{ fontSize:12.5, color:'#d83933', marginTop:4 }}>{err}</div>}
        </div>
        <button onClick={verify} disabled={!pw||loading}
          style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:(!pw||loading)?.6:1, whiteSpace:'nowrap' }}>
          {loading?'Verifying…':'View'}
        </button>
      </div>
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────
function EmpField({ label, value, field, editing, onEdit, type='text' }: any) {
  if (editing) {
    return (
      <div style={{ marginBottom:14 }}>
        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:5 }}>{label}</label>
        <input type={type} defaultValue={value||''}
          onChange={e=>onEdit(field, e.target.value)}
          style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'var(--surface)', color:'var(--ink)' }} />
      </div>
    );
  }
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, color: value ? 'var(--ink)' : 'var(--ink-4)', fontStyle: value ? 'normal' : 'italic' }}>{value || 'Not provided'}</div>
    </div>
  );
}

export default function ESSProfile() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing]       = useState(false);
  const [editData, setEditData]     = useState<Record<string,string>>({});
  const [saved, setSaved]           = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const { data: emp, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/employees/me').then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: (dto: any) => api.patch('/employees/me', dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      setSaved('Profile updated successfully');
      setEditing(false);
      setTimeout(() => setSaved(''), 3000);
    },
    onError: (e: any) => alert(e?.response?.data?.message || 'Update failed'),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setPhotoUploading(true);
    try {
      const result = await uploadToCloudinary(file, 'payrollos/users', () => {});
      await api.patch('/auth/me/photo', { photoUrl: result.url });
      updateUser({ photoUrl: result.url });
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    } catch { setPhotoError('Photo upload failed'); }
    finally { setPhotoUploading(false); }
    e.target.value = '';
  };

  const startEdit = () => {
    setEditData({
      phone: emp?.phone || '',
      address: emp?.address || '',
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateMut.mutate(editData);
  };

  const onEdit = (field: string, val: string) => setEditData(p => ({ ...p, [field]: val }));

  const name   = `${user?.firstName||''} ${user?.lastName||''}`.trim();
  const colors  = ['#0a84ff','#28a745','#ff9500','#af52de'];
  const color   = colors[(name.charCodeAt(0)||0) % colors.length];
  const region  = emp?.region || user?.organizationId;
  const isUAE   = !emp?.region || emp.region === 'UAE';
  const cur     = isUAE ? 'AED' : '₹';

  if (isLoading) return <ESSLayout><div style={{ padding:40, textAlign:'center', color:'var(--ink-3)' }}>Loading…</div></ESSLayout>;

  if (!emp) return (
    <ESSLayout>
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:48, textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No employee profile linked</div>
        <div style={{ fontSize:13.5, color:'var(--ink-3)' }}>Contact your HR administrator to link your account</div>
      </div>
    </ESSLayout>
  );

  return (
    <ESSLayout>
      <div style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.01em', color:'var(--ink)' }}>My profile</h1>
          <p style={{ fontSize:13.5, color:'var(--ink-3)', marginTop:4 }}>Your employment details</p>
        </div>
        {!editing
          ? <button onClick={startEdit} style={{ padding:'8px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
          : <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleSave} disabled={updateMut.isPending} style={{ padding:'8px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {updateMut.isPending ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={()=>setEditing(false)} style={{ padding:'8px 16px', background:'var(--bg)', color:'var(--ink-2)', border:'1px solid var(--line)', borderRadius:8, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            </div>
        }
      </div>

      {saved && <div style={{ background:'#e7f6ea', border:'1px solid #28a74533', borderRadius:9, padding:'10px 16px', fontSize:13.5, color:'#28a745', fontWeight:500, marginBottom:16 }}>{saved}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        {/* LEFT: Personal */}
        <div>
          {/* Photo + name card */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:22, marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:16 }}>Personal details</div>
            {/* Photo */}
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:22, paddingBottom:18, borderBottom:'1px solid var(--line)' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoUpload} />
                <div onClick={()=>!photoUploading&&fileRef.current?.click()}
                  style={{ width:72, height:72, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:24, fontWeight:700, cursor:'pointer', overflow:'hidden', border:'3px solid var(--line)', position:'relative' }}>
                  {user?.photoUrl
                    ? <img src={user.photoUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                    : <>{name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</>
                  }
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'.15s', fontSize:11, color:'#fff', fontWeight:600, textAlign:'center' }}
                    onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
                    {photoUploading ? 'Uploading…' : 'Change'}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:'var(--ink)' }}>{emp.firstName} {emp.lastName}</div>
                <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:2 }}>{emp.employeeCode} · {emp.designation}</div>
                <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:2 }}>{emp.department?.name}</div>
                {photoError && <div style={{ fontSize:12, color:'#d83933', marginTop:4 }}>{photoError}</div>}
                <div style={{ fontSize:11.5, color:'var(--ink-4)', marginTop:5 }}>Click photo to change</div>
              </div>
            </div>

            <EmpField label="Email" value={emp.email} field="email" editing={false} onEdit={onEdit} />
            <EmpField label="Phone" value={emp.phone} field="phone" editing={editing} onEdit={onEdit} />
            <EmpField label="Department" value={emp.department?.name} field="" editing={false} onEdit={onEdit} />
            <EmpField label="Joining date" value={emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : ''} field="" editing={false} onEdit={onEdit} />
            <EmpField label="Status" value={emp.status} field="" editing={false} onEdit={onEdit} />
          </div>
        </div>

        {/* RIGHT: Sensitive sections */}
        <div>
          {/* Salary details — PIN gated */}
          <SensitiveSection title="Salary details" description="Enter your password to view salary information">
            <div style={{ background:'linear-gradient(135deg,#0a84ff,#0055cc)', borderRadius:10, padding:20, color:'#fff', marginBottom:12 }}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>
                {emp.salaryStructure?.basicSalary ? 'Basic salary / month' : 'Annual CTC'}
              </div>
              {!emp.salaryStructure ? (
                <div style={{ fontSize:14, opacity:.7 }}>Not configured — contact HR</div>
              ) : (
                <>
                  <div style={{ fontSize:28, fontWeight:800, fontVariantNumeric:'tabular-nums' }}>
                    {cur} {(emp.salaryStructure.basicSalary || Math.round((emp.salaryStructure.ctcAnnual||0)/12)).toLocaleString()}
                  </div>
                  {emp.salaryStructure.basicSalary > 0 && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.2)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13 }}>
                      {emp.salaryStructure.housingAllowance>0 && <div><div style={{ opacity:.7, fontSize:11 }}>Housing</div><div style={{ fontWeight:600 }}>{cur} {emp.salaryStructure.housingAllowance.toLocaleString()}</div></div>}
                      {emp.salaryStructure.transportAllowance>0 && <div><div style={{ opacity:.7, fontSize:11 }}>Transport</div><div style={{ fontWeight:600 }}>{cur} {emp.salaryStructure.transportAllowance.toLocaleString()}</div></div>}
                      {emp.salaryStructure.medicalAllowance>0 && <div><div style={{ opacity:.7, fontSize:11 }}>Medical</div><div style={{ fontWeight:600 }}>{cur} {emp.salaryStructure.medicalAllowance.toLocaleString()}</div></div>}
                    </div>
                  )}
                </>
              )}
            </div>
          </SensitiveSection>

          {/* Bank & ID details — PIN gated */}
          <SensitiveSection title="Bank & identity details" description="Enter your password to view and update bank details">
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:2 }}>
              {isUAE ? (
                <>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>IBAN (for salary payment)</label>
                    {editing ? (
                      <input defaultValue={emp.iban||''} onChange={e=>onEdit('iban',e.target.value)}
                        style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'var(--surface)', color:'var(--ink)' }}
                        placeholder="AE070331234567890123456" />
                    ) : (
                      <div style={{ fontSize:14, color:emp.iban?'var(--ink)':'#d83933', fontFamily:emp.iban?'monospace':'inherit', fontStyle:emp.iban?'normal':'italic' }}>
                        {emp.iban || 'Not provided — required for salary payment'}
                      </div>
                    )}
                    {!emp.iban && <div style={{ fontSize:12, color:'#c77700', marginTop:5, background:'#fdf3e0', padding:'6px 10px', borderRadius:7 }}>Add your IBAN so your salary can be processed via WPS</div>}
                  </div>
                  <EmpField label="Emirates ID" value={emp.emiratesId} field="emiratesId" editing={editing} onEdit={onEdit} />
                  <EmpField label="Passport number" value={emp.passportNo} field="passportNo" editing={editing} onEdit={onEdit} />
                  <EmpField label="Visa number" value={emp.visaNo} field="visaNo" editing={editing} onEdit={onEdit} />
                  <EmpField label="Nationality" value={emp.nationality} field="nationality" editing={editing} onEdit={onEdit} />
                </>
              ) : (
                <>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Bank account number</label>
                    {editing ? (
                      <input defaultValue={emp.bankAccount||''} onChange={e=>onEdit('bankAccount',e.target.value)}
                        style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'var(--surface)', color:'var(--ink)' }}
                        placeholder="Account number" />
                    ) : (
                      <div style={{ fontSize:14, color:emp.bankAccount?'var(--ink)':'#d83933', fontFamily:emp.bankAccount?'monospace':'inherit', fontStyle:emp.bankAccount?'normal':'italic' }}>
                        {emp.bankAccount || 'Not provided'}
                      </div>
                    )}
                  </div>
                  <EmpField label="PAN number" value={emp.panNo} field="panNo" editing={editing} onEdit={onEdit} />
                  <EmpField label="Aadhaar number" value={emp.aadhaarNo} field="aadhaarNo" editing={editing} onEdit={onEdit} />
                </>
              )}
            </div>
            {editing && (
              <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--line)', display:'flex', gap:10 }}>
                <button onClick={handleSave} disabled={updateMut.isPending}
                  style={{ padding:'9px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {updateMut.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button onClick={()=>setEditing(false)}
                  style={{ padding:'9px 16px', background:'var(--bg)', color:'var(--ink-2)', border:'1px solid var(--line)', borderRadius:8, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancel
                </button>
              </div>
            )}
          </SensitiveSection>
        </div>
      </div>
    </ESSLayout>
  );
}

'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout, Card, SectionTitle, fieldStyle } from '../_components';
import { api, settingsApi } from '@/lib/api';

export default function AttendanceSettings() {
  const qc = useQueryClient();
  const inp = fieldStyle;
  const btn = (bg='#0a84ff',fg='#fff'):React.CSSProperties => ({ padding:'7px 14px',background:bg,color:fg,border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' });

  // ── OPE Types ─────────────────────────────────────────────
  const [opeForm, setOpeForm]   = useState({ name:'', amountType:'FIXED', fixedAmount:'', billRequired:false });
  const [editOpe, setEditOpe]   = useState<any>(null);
  const [addingOpe, setAddingOpe] = useState(false);

  const { data: opeTypes = [] } = useQuery({ queryKey:['ope-types'], queryFn:()=>api.get('/settings/ope-types').then(r=>r.data) });

  const createOpeMut = useMutation({
    mutationFn: (dto:any) => api.post('/settings/ope-types', dto).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['ope-types']}); setAddingOpe(false); setOpeForm({name:'',amountType:'FIXED',fixedAmount:'',billRequired:false}); },
  });
  const updateOpeMut = useMutation({
    mutationFn: ({id,...dto}:any) => api.patch(`/settings/ope-types/${id}`, dto).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['ope-types']}); setEditOpe(null); },
  });
  const deleteOpeMut = useMutation({
    mutationFn: (id:string) => api.delete(`/settings/ope-types/${id}`).then(r=>r.data),
    onSuccess: () => qc.invalidateQueries({queryKey:['ope-types']}),
    onError: (e:any) => alert(e?.response?.data?.message || 'Cannot delete'),
  });

  const saveOpe = () => {
    const dto = { ...opeForm, fixedAmount: opeForm.fixedAmount ? +opeForm.fixedAmount : null };
    if (editOpe) updateOpeMut.mutate({ id:editOpe.id, ...dto });
    else createOpeMut.mutate(dto);
  };

  // ── Branch geo ────────────────────────────────────────────
  const [selBranch, setSelBranch] = useState('');
  const [geoForm, setGeoForm]     = useState({ latitude:'', longitude:'', radiusMetres:'100', allowedIps:'' });
  const [geoSaved, setGeoSaved]   = useState(false);
  const [capturing, setCapturing] = useState(false);

  const { data: branches = [] } = useQuery({ queryKey:['branches'], queryFn:()=>api.get('/settings/branches').then(r=>r.data) });

  const updateGeoMut = useMutation({
    mutationFn: (dto:any) => api.patch(`/settings/branches/${selBranch}/geo`, dto).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['branches']}); setGeoSaved(true); setTimeout(()=>setGeoSaved(false),3000); },
  });

  const captureLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported by this browser'); return; }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoForm(p => ({ ...p, latitude: pos.coords.latitude.toFixed(7), longitude: pos.coords.longitude.toFixed(7) }));
        setCapturing(false);
      },
      err => { alert('Could not get location: ' + err.message); setCapturing(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const selBranchData: any = (branches as any[]).find((b:any) => b.id === selBranch);

  return (
    <SettingsLayout title="Attendance settings" subtitle="Configure office locations, geofencing, and OPE expense types">

      {/* ── Branch geo settings ──────────────────────────── */}
      <Card>
        <SectionTitle>Office location & geofencing</SectionTitle>
        <p style={{ fontSize:13, color:'var(--ink-3)', marginBottom:16, lineHeight:1.6 }}>
          Set GPS coordinates and allowed WiFi IPs per branch. Employees clocking in as "Office" will be validated against these. Only admins can see location data.
        </p>

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Select branch</label>
          <select style={inp} value={selBranch} onChange={e=>{
            setSelBranch(e.target.value);
            const b = (branches as any[]).find((x:any)=>x.id===e.target.value);
            if (b) setGeoForm({ latitude:b.latitude||'', longitude:b.longitude||'', radiusMetres:b.radiusMetres||100, allowedIps:b.allowedIps||'' });
          }}>
            <option value="">Select a branch…</option>
            {(branches as any[]).map((b:any) => <option key={b.id} value={b.id}>{b.name} {b.city ? `— ${b.city}` : ''}</option>)}
          </select>
        </div>

        {selBranch && (
          <>
            {geoSaved && <div style={{ background:'#e7f6ea', border:'1px solid #28a74533', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'#28a745', fontWeight:500, marginBottom:16 }}>Saved successfully</div>}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Latitude</label>
                <input style={inp} value={geoForm.latitude} onChange={e=>setGeoForm(p=>({...p,latitude:e.target.value}))} placeholder="e.g. 25.2048493" />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Longitude</label>
                <input style={inp} value={geoForm.longitude} onChange={e=>setGeoForm(p=>({...p,longitude:e.target.value}))} placeholder="e.g. 55.2707828" />
              </div>
            </div>

            {/* Capture current location button */}
            <button onClick={captureLocation} disabled={capturing}
              style={{ ...btn('#e8f1fe','#0a84ff'), marginBottom:14, border:'1px solid #0a84ff33' }}>
              {capturing ? 'Capturing…' : '📍 Use my current location'}
            </button>
            <p style={{ fontSize:12, color:'var(--ink-3)', marginBottom:16 }}>
              Click the button while sitting at the office to automatically capture coordinates.
            </p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Radius (metres)</label>
                <input style={inp} type="number" value={geoForm.radiusMetres} onChange={e=>setGeoForm(p=>({...p,radiusMetres:e.target.value}))} placeholder="100" />
                <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:4 }}>Employee must be within this distance of the office</p>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Allowed WiFi IPs</label>
                <input style={inp} value={geoForm.allowedIps} onChange={e=>setGeoForm(p=>({...p,allowedIps:e.target.value}))} placeholder="192.168.1.1, 10.0.0.1" />
                <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:4 }}>Comma-separated IP addresses or prefixes</p>
              </div>
            </div>

            <button onClick={()=>updateGeoMut.mutate({ latitude:+geoForm.latitude||null, longitude:+geoForm.longitude||null, radiusMetres:+geoForm.radiusMetres||100, allowedIps:geoForm.allowedIps||null })}
              disabled={!geoForm.latitude||!geoForm.longitude||updateGeoMut.isPending}
              style={btn()}>
              {updateGeoMut.isPending ? 'Saving…' : 'Save location settings'}
            </button>
          </>
        )}
      </Card>

      {/* ── OPE Types ─────────────────────────────────────── */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <SectionTitle>OPE expense types</SectionTitle>
          <button style={btn()} onClick={()=>{ setAddingOpe(v=>!v); setEditOpe(null); setOpeForm({name:'',amountType:'FIXED',fixedAmount:'',billRequired:false}); }}>
            {addingOpe ? 'Cancel' : 'Add expense type'}
          </button>
        </div>

        <p style={{ fontSize:13, color:'var(--ink-3)', marginBottom:16, lineHeight:1.6 }}>
          Define out-of-pocket expense types employees can log when clocking out. Bill upload is required for Taxi and Food by default.
        </p>

        {(addingOpe || editOpe) && (
          <div style={{ background:'var(--bg)', border:'1px solid var(--line)', borderRadius:10, padding:18, marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:14 }}>{editOpe ? 'Edit expense type' : 'New expense type'}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Name</label>
                <input style={inp} value={opeForm.name} onChange={e=>setOpeForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Metro, Taxi, Food" />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Amount type</label>
                <select style={inp} value={opeForm.amountType} onChange={e=>setOpeForm(p=>({...p,amountType:e.target.value}))}>
                  <option value="FIXED">Fixed amount</option>
                  <option value="ACTUAL">Actual (employee enters)</option>
                </select>
              </div>
              {opeForm.amountType === 'FIXED' && (
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Fixed amount (AED)</label>
                  <input style={inp} type="number" value={opeForm.fixedAmount} onChange={e=>setOpeForm(p=>({...p,fixedAmount:e.target.value}))} placeholder="e.g. 3.00" />
                </div>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <input type="checkbox" id="billReq" checked={opeForm.billRequired} onChange={e=>setOpeForm(p=>({...p,billRequired:e.target.checked}))} />
              <label htmlFor="billReq" style={{ fontSize:13.5, color:'var(--ink)', cursor:'pointer' }}>Bill upload required</label>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button style={btn()} onClick={saveOpe} disabled={!opeForm.name||(createOpeMut.isPending||updateOpeMut.isPending)}>
                {editOpe ? 'Save changes' : 'Add expense type'}
              </button>
              <button style={btn('var(--bg)','var(--ink-2)')} onClick={()=>{ setAddingOpe(false); setEditOpe(null); }}>Cancel</button>
            </div>
          </div>
        )}

        {(opeTypes as any[]).length === 0 ? (
          <div style={{ padding:'28px 0', textAlign:'center', color:'var(--ink-3)', fontSize:13.5 }}>
            No expense types yet. Add Metro, Taxi, Food etc. above.
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:'1px solid var(--line)' }}>
              {['Expense type','Amount type','Amount','Bill required','Active','Actions'].map((h,i)=>(
                <th key={h} style={{ padding:'9px 14px', textAlign:i>=5?'right':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(opeTypes as any[]).map((t:any) => (
                <tr key={t.id} style={{ borderBottom:'1px solid var(--line)' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={{ padding:'11px 14px', fontWeight:500, color:'var(--ink)', fontSize:13.5 }}>{t.name}</td>
                  <td style={{ padding:'11px 14px', fontSize:13, color:'var(--ink-2)' }}>{t.amountType === 'FIXED' ? 'Fixed' : 'Actual'}</td>
                  <td style={{ padding:'11px 14px', fontSize:13, color:'var(--ink-2)' }}>{t.amountType === 'FIXED' ? `AED ${t.fixedAmount}` : 'Employee enters'}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ fontSize:12.5, fontWeight:600, color:t.billRequired?'#28a745':'#6e6e73', background:t.billRequired?'#e7f6ea':'#f2f2f7', padding:'3px 10px', borderRadius:999 }}>
                      {t.billRequired ? 'Required' : 'Not required'}
                    </span>
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <button onClick={()=>updateOpeMut.mutate({id:t.id,active:!t.active})}
                      style={{ ...btn(t.active?'#e7f6ea':'#fdecea', t.active?'#28a745':'#d83933'), fontSize:12 }}>
                      {t.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding:'11px 14px', textAlign:'right' }}>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button style={btn('var(--bg)','var(--ink)')} onClick={()=>{ setEditOpe(t); setAddingOpe(false); setOpeForm({name:t.name,amountType:t.amountType,fixedAmount:t.fixedAmount||'',billRequired:t.billRequired}); }}>Edit</button>
                      <button style={btn('#fdecea','#d83933')} onClick={()=>{ if(window.confirm(`Delete "${t.name}"?`)) deleteOpeMut.mutate(t.id); }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </SettingsLayout>
  );
}

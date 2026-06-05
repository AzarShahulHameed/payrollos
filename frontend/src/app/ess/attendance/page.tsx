'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { uploadToCloudinary } from '@/lib/cloudinary';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  PRESENT:  {bg:'#e7f6ea',color:'#28a745'},
  ABSENT:   {bg:'#fdecea',color:'#d83933'},
  HALF_DAY: {bg:'#fdf3e0',color:'#c77700'},
  ON_LEAVE: {bg:'#e8f1fe',color:'#0a84ff'},
  LATE:     {bg:'#fdf3e0',color:'#c77700'},
  HOLIDAY:  {bg:'#f2f2f7',color:'#6e6e73'},
};

// ── Clock-in Modal ────────────────────────────────────────────
function ClockInModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:()=>void }) {
  const [locType, setLocType] = useState<'OFFICE'|'REMOTE'|'HOME'|''>('');
  const [step, setStep]       = useState<'choose'|'validating'|'ready'>('choose');
  const [coords, setCoords]   = useState<{lat:number;lng:number}|null>(null);
  const [ip, setIp]           = useState('');
  const [geoErr, setGeoErr]   = useState('');
  const [loading, setLoading] = useState(false);

  const clockInMut = useMutation({
    mutationFn: (dto:any) => api.post('/attendance/clock-in', dto).then(r=>r.data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e:any) => alert(e?.response?.data?.message || 'Clock in failed'),
  });

  const handleOffice = () => {
    setLocType('OFFICE');
    setStep('validating');
    setGeoErr('');
    // Get GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setStep('ready');
        },
        err => {
          setGeoErr('Could not get GPS location. You can still clock in as Remote or Home.');
          setStep('choose');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoErr('GPS not supported on this device');
      setStep('choose');
    }
    // Get client IP via public API
    fetch('https://api.ipify.org?format=json')
      .then(r=>r.json())
      .then(d=>setIp(d.ip))
      .catch(()=>{});
  };

  const handleClockIn = () => {
    setLoading(true);
    clockInMut.mutate({
      locationType: locType,
      latitude:     coords?.lat,
      longitude:    coords?.lng,
      wifiIp:       ip || undefined,
    });
  };

  const loc: React.CSSProperties = { border:'2px solid var(--line)', borderRadius:14, padding:'20px 24px', cursor:'pointer', transition:'all .15s', textAlign:'center', flex:1 };
  const locActive: React.CSSProperties = { ...loc, borderColor:'#0a84ff', background:'#e8f1fe' };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div style={{ background:'var(--surface)',borderRadius:18,padding:32,width:'100%',maxWidth:480,boxShadow:'0 24px 64px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize:20,fontWeight:700,color:'var(--ink)',marginBottom:6 }}>Clock in</div>
        <div style={{ fontSize:13.5,color:'var(--ink-3)',marginBottom:24 }}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>

        {geoErr && <div style={{ background:'#fdf3e0',border:'1px solid #c7770033',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#c77700',marginBottom:16 }}>{geoErr}</div>}

        {step === 'validating' ? (
          <div style={{ textAlign:'center',padding:'32px 0' }}>
            <div style={{ fontSize:14,color:'var(--ink-3)' }}>Getting your location…</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:13,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:12 }}>Where are you working from?</div>
            <div style={{ display:'flex',gap:12,marginBottom:24 }}>
              <div style={locType==='OFFICE'?locActive:loc} onClick={handleOffice}>
                <div style={{ fontSize:24,marginBottom:8 }}>🏢</div>
                <div style={{ fontSize:13.5,fontWeight:600,color:'var(--ink)' }}>Office</div>
                <div style={{ fontSize:12,color:'var(--ink-3)',marginTop:4 }}>GPS + WiFi validated</div>
              </div>
              <div style={locType==='REMOTE'?locActive:loc} onClick={()=>{ setLocType('REMOTE'); setStep('ready'); }}>
                <div style={{ fontSize:24,marginBottom:8 }}>💼</div>
                <div style={{ fontSize:13.5,fontWeight:600,color:'var(--ink)' }}>Remote (Client)</div>
                <div style={{ fontSize:12,color:'var(--ink-3)',marginTop:4 }}>Working at client site</div>
              </div>
              <div style={locType==='HOME'?locActive:loc} onClick={()=>{ setLocType('HOME'); setStep('ready'); }}>
                <div style={{ fontSize:24,marginBottom:8 }}>🏠</div>
                <div style={{ fontSize:13.5,fontWeight:600,color:'var(--ink)' }}>Home</div>
                <div style={{ fontSize:12,color:'var(--ink-3)',marginTop:4 }}>Working from home</div>
              </div>
            </div>

            {step === 'ready' && locType && (
              <>
                {locType === 'OFFICE' && coords && (
                  <div style={{ background:'#e7f6ea',border:'1px solid #28a74533',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#28a745',marginBottom:16 }}>
                    📍 Location captured: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </div>
                )}
                <div style={{ display:'flex',gap:10 }}>
                  <button onClick={handleClockIn} disabled={loading||clockInMut.isPending}
                    style={{ flex:1,padding:'12px 0',background:'#28a745',color:'#fff',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
                    {loading||clockInMut.isPending ? 'Clocking in…' : `Clock in — ${locType}`}
                  </button>
                  <button onClick={onClose} style={{ padding:'12px 18px',background:'var(--bg)',color:'var(--ink-2)',border:'1px solid var(--line)',borderRadius:9,fontSize:14,cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
                </div>
              </>
            )}

            {!locType && (
              <button onClick={onClose} style={{ width:'100%',padding:'11px 0',background:'var(--bg)',color:'var(--ink-2)',border:'1px solid var(--line)',borderRadius:9,fontSize:14,cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Clock-out Modal with OPE ──────────────────────────────────
function ClockOutModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:()=>void }) {
  const [opeEntries, setOpeEntries] = useState<any[]>([]);
  const [addingOpe, setAddingOpe]   = useState(false);
  const [opeForm, setOpeForm]       = useState({ opeTypeId:'', amount:'', remarks:'', billUrl:'' });
  const [uploading, setUploading]   = useState(false);

  const { data: opeTypes = [] } = useQuery({
    queryKey: ['ope-types-active'],
    queryFn: () => api.get('/attendance/ope-types').then(r=>r.data),
  });

  const clockOutMut = useMutation({
    mutationFn: (dto:any) => api.post('/attendance/clock-out', dto).then(r=>r.data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e:any) => alert(e?.response?.data?.message || 'Clock out failed'),
  });

  const selType: any = (opeTypes as any[]).find((t:any) => t.id === opeForm.opeTypeId);

  const addOpe = () => {
    if (!opeForm.opeTypeId) { alert('Select expense type'); return; }
    if (selType?.billRequired && !opeForm.billUrl) { alert('Bill upload required for this expense type'); return; }
    const amount = selType?.amountType === 'FIXED' ? selType.fixedAmount : +opeForm.amount;
    setOpeEntries(p => [...p, { opeTypeId:opeForm.opeTypeId, amount, billUrl:opeForm.billUrl, remarks:opeForm.remarks, typeName:selType?.name }]);
    setOpeForm({ opeTypeId:'', amount:'', remarks:'', billUrl:'' });
    setAddingOpe(false);
  };

  const uploadBill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, 'payrollos/ope', ()=>{});
      setOpeForm(p => ({ ...p, billUrl: result.url }));
    } catch { alert('Upload failed'); }
    finally { setUploading(false); }
    e.target.value = '';
  };

  const totalOpe = opeEntries.reduce((s,e) => s+e.amount, 0);

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div style={{ background:'var(--surface)',borderRadius:18,padding:32,width:'100%',maxWidth:520,boxShadow:'0 24px 64px rgba(0,0,0,.2)',maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ fontSize:20,fontWeight:700,color:'var(--ink)',marginBottom:6 }}>Clock out</div>
        <div style={{ fontSize:13.5,color:'var(--ink-3)',marginBottom:24 }}>Log any out-of-pocket expenses before clocking out</div>

        {/* OPE entries */}
        {opeEntries.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:10 }}>Expenses added</div>
            {opeEntries.map((e,i) => (
              <div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--bg)',borderRadius:9,border:'1px solid var(--line)',marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:13.5,fontWeight:500,color:'var(--ink)' }}>{e.typeName}</div>
                  {e.remarks && <div style={{ fontSize:12,color:'var(--ink-3)',marginTop:2 }}>{e.remarks}</div>}
                  {e.billUrl && <div style={{ fontSize:11,color:'#28a745',marginTop:2 }}>✓ Bill uploaded</div>}
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:14,fontWeight:700,color:'var(--ink)' }}>AED {e.amount.toFixed(2)}</span>
                  <button onClick={()=>setOpeEntries(p=>p.filter((_,j)=>j!==i))}
                    style={{ background:'none',border:'none',cursor:'pointer',color:'#d83933',fontSize:18,padding:0 }}>×</button>
                </div>
              </div>
            ))}
            <div style={{ textAlign:'right',fontSize:13.5,fontWeight:700,color:'var(--ink)',marginTop:8 }}>
              Total: AED {totalOpe.toFixed(2)}
            </div>
          </div>
        )}

        {/* Add OPE */}
        {addingOpe ? (
          <div style={{ background:'var(--bg)',border:'1px solid var(--line)',borderRadius:10,padding:18,marginBottom:16 }}>
            <div style={{ fontSize:14,fontWeight:600,color:'var(--ink)',marginBottom:14 }}>Add expense</div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:6 }}>Expense type</label>
              <select style={{ width:'100%',padding:'9px 12px',border:'1px solid var(--line-2)',borderRadius:8,fontSize:13.5,fontFamily:'inherit',background:'var(--surface)',color:'var(--ink)',outline:'none' }}
                value={opeForm.opeTypeId} onChange={e=>setOpeForm(p=>({...p,opeTypeId:e.target.value,amount:''}))}>
                <option value="">Select expense type…</option>
                {(opeTypes as any[]).map((t:any) => (
                  <option key={t.id} value={t.id}>{t.name} {t.amountType==='FIXED'?`— AED ${t.fixedAmount}`:''}</option>
                ))}
              </select>
            </div>

            {selType?.amountType === 'ACTUAL' && (
              <div style={{ marginBottom:12 }}>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:6 }}>Amount (AED)</label>
                <input type="number" value={opeForm.amount} onChange={e=>setOpeForm(p=>({...p,amount:e.target.value}))}
                  style={{ width:'100%',padding:'9px 12px',border:'1px solid var(--line-2)',borderRadius:8,fontSize:13.5,fontFamily:'inherit',background:'var(--surface)',color:'var(--ink)',outline:'none' }}
                  placeholder="Enter amount" />
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:6 }}>Remarks (optional)</label>
              <input value={opeForm.remarks} onChange={e=>setOpeForm(p=>({...p,remarks:e.target.value}))}
                style={{ width:'100%',padding:'9px 12px',border:'1px solid var(--line-2)',borderRadius:8,fontSize:13.5,fontFamily:'inherit',background:'var(--surface)',color:'var(--ink)',outline:'none' }}
                placeholder="Any notes" />
            </div>

            {selType?.billRequired && (
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:6 }}>
                  Bill upload <span style={{ color:'#d83933' }}>*</span>
                </label>
                {opeForm.billUrl ? (
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <span style={{ fontSize:13,color:'#28a745' }}>✓ Bill uploaded</span>
                    <button onClick={()=>setOpeForm(p=>({...p,billUrl:''}))} style={{ fontSize:12,color:'#d83933',background:'none',border:'none',cursor:'pointer' }}>Remove</button>
                  </div>
                ) : (
                  <label style={{ display:'inline-block',padding:'8px 16px',background:'var(--surface)',border:'1px solid var(--line-2)',borderRadius:8,fontSize:13.5,cursor:'pointer',color:'var(--ink)' }}>
                    {uploading ? 'Uploading…' : '📎 Upload bill'}
                    <input type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={uploadBill} />
                  </label>
                )}
              </div>
            )}

            <div style={{ display:'flex',gap:10 }}>
              <button onClick={addOpe} style={{ padding:'9px 20px',background:'#0a84ff',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>Add</button>
              <button onClick={()=>setAddingOpe(false)} style={{ padding:'9px 16px',background:'var(--bg)',color:'var(--ink-2)',border:'1px solid var(--line)',borderRadius:8,fontSize:13.5,cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setAddingOpe(true)}
            style={{ width:'100%',padding:'11px 0',background:'var(--bg)',color:'var(--ink-2)',border:'1px dashed var(--line-2)',borderRadius:9,fontSize:13.5,cursor:'pointer',fontFamily:'inherit',marginBottom:16 }}>
            + Add expense
          </button>
        )}

        {/* Clock out button */}
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={()=>clockOutMut.mutate({ opeEntries })} disabled={clockOutMut.isPending}
            style={{ flex:1,padding:'12px 0',background:'#d83933',color:'#fff',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
            {clockOutMut.isPending ? 'Clocking out…' : 'Clock out'}
          </button>
          <button onClick={onClose} style={{ padding:'12px 18px',background:'var(--bg)',color:'var(--ink-2)',border:'1px solid var(--line)',borderRadius:9,fontSize:14,cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
        </div>
        <p style={{ fontSize:12,color:'var(--ink-3)',textAlign:'center',marginTop:10 }}>You can clock out without adding expenses</p>
      </div>
    </div>
  );
}

// ── Main attendance page ───────────────────────────────────────
export default function ESSAttendance() {
  const qc  = useQueryClient();
  const now = new Date();
  const [showClockIn, setShowClockIn]   = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);

  const { data: monthData } = useQuery({
    queryKey: ['my-attendance', now.getFullYear(), now.getMonth()+1],
    queryFn: () => api.get(`/attendance/my?year=${now.getFullYear()}&month=${now.getMonth()+1}`).then(r=>r.data),
    refetchInterval: 30000,
  });

  const records: any[] = (monthData as any)?.records || [];
  const summary: any   = (monthData as any)?.summary  || {};
  const today          = now.toISOString().split('T')[0];
  const todayRecord    = records.find((r:any) => r.date?.startsWith(today));
  const isClockedIn    = !!todayRecord?.checkIn && !todayRecord?.checkOut;
  const isClockedOut   = !!todayRecord?.checkIn && !!todayRecord?.checkOut;

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '—';
  const locIcon = (t?:string) => t==='OFFICE'?'🏢':t==='REMOTE'?'💼':t==='HOME'?'🏠':'';
  const refresh = () => qc.invalidateQueries({ queryKey:['my-attendance'] });

  return (
    <ESSLayout>
      {showClockIn  && <ClockInModal  onClose={()=>setShowClockIn(false)}  onSuccess={refresh} />}
      {showClockOut && <ClockOutModal onClose={()=>setShowClockOut(false)} onSuccess={refresh} />}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22,fontWeight:700,letterSpacing:'-.01em',color:'var(--ink)' }}>Attendance</h1>
        <p style={{ fontSize:13.5,color:'var(--ink-3)',marginTop:4 }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
      </div>

      {/* Clock in/out card */}
      <div style={{ background:'var(--surface)',border:'1px solid var(--line)',borderRadius:14,padding:28,marginBottom:20 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16 }}>
          <div>
            <div style={{ fontSize:13,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8 }}>Today</div>
            <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
              {todayRecord?.checkIn && (
                <div style={{ fontSize:13.5,color:'var(--ink-2)' }}>
                  {locIcon(todayRecord.locationType)} In: <strong>{fmt(todayRecord.checkIn)}</strong>
                </div>
              )}
              {todayRecord?.checkOut && (
                <div style={{ fontSize:13.5,color:'var(--ink-2)' }}>
                  Out: <strong>{fmt(todayRecord.checkOut)}</strong>
                </div>
              )}
              {todayRecord?.hoursWorked && (
                <div style={{ fontSize:13.5,color:'var(--ink-2)' }}>
                  {todayRecord.hoursWorked.toFixed(1)}h worked
                </div>
              )}
              {!todayRecord?.checkIn && (
                <div style={{ fontSize:13.5,color:'var(--ink-3)',fontStyle:'italic' }}>Not clocked in yet</div>
              )}
            </div>
          </div>

          <div>
            {!todayRecord?.checkIn && (
              <button className="clock-btn" onClick={()=>setShowClockIn(true)}
                style={{ padding:'12px 32px',background:'#28a745',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
                Clock in
              </button>
            )}
            {isClockedIn && (
              <button className="clock-btn" onClick={()=>setShowClockOut(true)}
                style={{ padding:'12px 32px',background:'#d83933',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
                Clock out
              </button>
            )}
            {isClockedOut && (
              <div style={{ padding:'10px 20px',background:'#e7f6ea',border:'1px solid #28a74533',borderRadius:10,fontSize:13.5,color:'#28a745',fontWeight:600 }}>
                ✓ Completed for today
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:20 }}>
        {[
          { label:'Present', value:summary.present||0, color:'#28a745' },
          { label:'Absent',  value:summary.absent||0,  color:'#d83933' },
          { label:'Hours',   value:`${(summary.totalHours||0).toFixed(0)}h`, color:'#0a84ff' },
          { label:'LOP days',value:summary.lopDays||0,  color:'#c77700' },
        ].map(c=>(
          <div key={c.label} style={{ background:'var(--surface)',border:'1px solid var(--line)',borderRadius:12,padding:'16px 18px' }}>
            <div style={{ fontSize:22,fontWeight:800,color:c.color,fontVariantNumeric:'tabular-nums' }}>{c.value}</div>
            <div style={{ fontSize:13,color:'var(--ink-3)',marginTop:4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly table */}
      <div style={{ background:'var(--surface)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden' }}>
        <div className="table-scroll">
          <table style={{ width:'100%',borderCollapse:'collapse',minWidth:500 }}>
            <thead><tr style={{ borderBottom:'1px solid var(--line)',background:'var(--bg)' }}>
              {['Date','Status','Location','Clock in','Clock out','Hours'].map((h,i)=>(
                <th key={h} style={{ padding:'10px 16px',textAlign:i>=3?'center':'left',fontSize:11,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {records.slice().reverse().map((r:any) => {
                const s = STATUS_STYLE[r.status] || STATUS_STYLE.PRESENT;
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid var(--line)' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <td style={{ padding:'11px 16px',fontSize:13.5,color:'var(--ink)',fontWeight:500 }}>
                      {new Date(r.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',weekday:'short'})}
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ fontSize:12.5,fontWeight:600,color:s.color,background:s.bg,padding:'3px 10px',borderRadius:999 }}>{r.status}</span>
                    </td>
                    <td style={{ padding:'11px 16px',fontSize:13,color:'var(--ink-2)' }}>
                      {r.locationType ? `${locIcon(r.locationType)} ${r.locationType}` : '—'}
                    </td>
                    <td style={{ padding:'11px 16px',textAlign:'center',fontSize:13,color:'var(--ink-2)',fontVariantNumeric:'tabular-nums' }}>{fmt(r.checkIn)}</td>
                    <td style={{ padding:'11px 16px',textAlign:'center',fontSize:13,color:'var(--ink-2)',fontVariantNumeric:'tabular-nums' }}>{fmt(r.checkOut)}</td>
                    <td style={{ padding:'11px 16px',textAlign:'center',fontSize:13,fontWeight:600,color:'var(--ink)',fontVariantNumeric:'tabular-nums' }}>
                      {r.hoursWorked ? r.hoursWorked.toFixed(1)+'h' : '—'}
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr><td colSpan={6} style={{ padding:'32px 0',textAlign:'center',color:'var(--ink-3)',fontSize:13.5 }}>No attendance records this month</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ESSLayout>
  );
}

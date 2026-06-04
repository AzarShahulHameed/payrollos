'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api, employeesApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency, initials } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

function EmpPicker({ region, onSelect }: any) {
  const [search, setSearch] = useState(''); const [open, setOpen] = useState(false); const [sel, setSel] = useState<any>(null);
  const { data } = useQuery({ queryKey:['emp-arrears',search,region], queryFn:()=>employeesApi.getAll({region,search,limit:10}), enabled:search.length>=1 });
  const emps = (data as any)?.data||[];
  const pick = (e: any) => { setSel(e); setOpen(false); setSearch(''); onSelect(e); };
  const clear = () => { setSel(null); setSearch(''); onSelect(null); };
  const inp: React.CSSProperties = { width:'100%', height:36, padding:'0 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' };
  return (
    <div style={{ position:'relative' }}>
      {sel ? (
        <div style={{ display:'flex', alignItems:'center', gap:8, height:36, padding:'0 10px', border:'1.5px solid #0a84ff', borderRadius:9, background:'#e8f1fe' }}>
          <div style={{ width:22,height:22,borderRadius:'50%',background:'#0a84ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:9,fontWeight:700 }}>{initials(`${sel.firstName} ${sel.lastName}`)}</div>
          <span style={{ fontSize:13.5,fontWeight:600,flex:1 }}>{sel.firstName} {sel.lastName}</span>
          <span style={{ fontSize:12,color:'#6e6e73' }}>{sel.employeeCode}</span>
          <button onClick={clear} style={{ background:'none',border:'none',color:'#6e6e73',cursor:'pointer',fontSize:16 }}>×</button>
        </div>
      ) : (
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#a1a1a6',fontSize:13,pointerEvents:'none' }}>⌕</span>
          <input style={{ ...inp, paddingLeft:28 }} placeholder="Search employee…" value={search}
            onChange={e=>{setSearch(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)} />
          {open && search.length>=1 && (
            <div style={{ position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #e3e3e6',borderRadius:10,boxShadow:'0 6px 24px rgba(0,0,0,.13)',zIndex:999,maxHeight:200,overflowY:'auto',marginTop:4 }}>
              {emps.length===0?<div style={{ padding:'14px 16px',color:'#a1a1a6',fontSize:13,textAlign:'center' }}>No employees found</div>
              :emps.map((e:any)=>(
                <div key={e.id} onMouseDown={()=>pick(e)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid #f5f5f7' }}
                  onMouseEnter={ev=>(ev.currentTarget.style.background='#f7f9fc')} onMouseLeave={ev=>(ev.currentTarget.style.background='')}>
                  <div style={{ width:28,height:28,borderRadius:'50%',background:'#0a84ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:700 }}>{initials(`${e.firstName} ${e.lastName}`)}</div>
                  <div><div style={{ fontSize:13.5,fontWeight:600 }}>{e.firstName} {e.lastName}</div><div style={{ fontSize:11.5,color:'#a1a1a6' }}>{e.employeeCode} · {e.designation}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ArrearsPage() {
  const { region } = useRegionStore();
  const cur = region === 'UAE' ? 'AED' : 'INR';
  const [emp, setEmp] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [applied, setApplied] = useState(false);
  const [form, setForm] = useState({ effectiveDate: '', newBasicSalary: '', newCtcAnnual: '', newHousing: '', newTransport: '', reason: '' });
  const s = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const calcMut = useMutation({ mutationFn: (body: any) => api.post('/arrears/calculate', body).then(r => r.data), onSuccess: setResult });
  const applyMut = useMutation({ mutationFn: (body: any) => api.post('/arrears/apply', body).then(r => r.data), onSuccess: d => { setResult(d); setApplied(true); } });

  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none' };
  const F = ({ label, children }: any) => <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>{label}</label>{children}</div>;

  const buildBody = () => ({
    employeeId: emp?.id,
    effectiveDate: form.effectiveDate,
    reason: form.reason || undefined,
    ...(region === 'UAE' ? {
      newBasicSalary: form.newBasicSalary ? +form.newBasicSalary : undefined,
      newHousing:     form.newHousing     ? +form.newHousing     : undefined,
      newTransport:   form.newTransport   ? +form.newTransport   : undefined,
    } : {
      newCtcAnnual: form.newCtcAnnual ? +form.newCtcAnnual : undefined,
    }),
  });

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Salary revision & arrears</h1>
        <p style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>Revise salary and calculate backdated arrears</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '360px 1fr' : '1fr', gap: 20, maxWidth: result ? 1100 : 560, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Salary revision details</h3>
          <F label="Employee"><EmpPicker region={region} onSelect={setEmp} /></F>
          <F label="Effective date"><input style={inp} type="date" value={form.effectiveDate} onChange={e => s('effectiveDate', e.target.value)} /></F>

          {region === 'UAE' ? <>
            <F label="New basic salary (AED/month)"><input style={inp} type="number" placeholder="Leave blank to keep current" value={form.newBasicSalary} onChange={e => s('newBasicSalary', e.target.value)} /></F>
            <F label="New housing allowance"><input style={inp} type="number" placeholder="Leave blank to keep current" value={form.newHousing} onChange={e => s('newHousing', e.target.value)} /></F>
            <F label="New transport allowance"><input style={inp} type="number" placeholder="Leave blank to keep current" value={form.newTransport} onChange={e => s('newTransport', e.target.value)} /></F>
          </> : <>
            <F label="New annual CTC (₹)"><input style={inp} type="number" placeholder="Leave blank to keep current" value={form.newCtcAnnual} onChange={e => s('newCtcAnnual', e.target.value)} /></F>
          </>}

          <F label="Reason"><textarea style={{ ...inp, minHeight: 60, resize: 'vertical' } as any} placeholder="e.g. Annual increment" value={form.reason} onChange={e => s('reason', e.target.value)} /></F>

          <button onClick={() => calcMut.mutate(buildBody())} disabled={!emp || !form.effectiveDate || calcMut.isPending}
            style={{ width:'100%', padding:'11px 0', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:(!emp||!form.effectiveDate)?0.5:1 }}>
            {calcMut.isPending ? 'Calculating…' : 'Calculate arrears'}
          </button>
        </div>

        {result && (
          <div>
            {applied && <div style={{ background:'#e7f6ea', border:'1px solid #28a74533', borderRadius:12, padding:'14px 18px', marginBottom:16, color:'#28a745', fontWeight:600, fontSize:14 }}>✅ {result.message}</div>}

            <div style={{ background:'linear-gradient(135deg,#0a84ff,#0055cc)', borderRadius:14, padding:'24px 28px', color:'#fff', marginBottom:16 }}>
              <div style={{ fontSize:13, opacity:.8, marginBottom:6 }}>Total arrears payable</div>
              <div style={{ fontSize:38, fontWeight:800, fontVariantNumeric:'tabular-nums' }}>{formatCurrency(result.totalArrears||0, cur)}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginTop:18, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.2)', fontSize:13 }}>
                <div><div style={{ opacity:.7, fontSize:11 }}>OLD GROSS/MONTH</div><div style={{ fontWeight:700 }}>{formatCurrency(result.oldGross||0, cur)}</div></div>
                <div><div style={{ opacity:.7, fontSize:11 }}>NEW GROSS/MONTH</div><div style={{ fontWeight:700 }}>{formatCurrency(result.newGross||0, cur)}</div></div>
                <div><div style={{ opacity:.7, fontSize:11 }}>MONTHLY DIFF</div><div style={{ fontWeight:700 }}>+{formatCurrency(result.monthlyDiff||0, cur)}</div></div>
              </div>
            </div>

            <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)', marginBottom:14 }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #e3e3e6', fontSize:15, fontWeight:600 }}>Arrears breakdown</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                <tbody>
                  {[
                    ['Pro-rata first month', result.breakdown?.proRataMonth?.note, result.breakdown?.proRataMonth?.amount],
                    ['Full months',          result.breakdown?.fullMonths?.note,   result.breakdown?.fullMonths?.amount],
                  ].map(([label, note, amount]: any) => (
                    <tr key={label} style={{ borderBottom:'1px solid rgba(0,0,0,.04)' }}>
                      <td style={{ padding:'12px 20px', fontWeight:500 }}>{label}</td>
                      <td style={{ padding:'12px 20px', color:'#6e6e73', fontSize:12.5 }}>{note}</td>
                      <td style={{ padding:'12px 20px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600, color:'#28a745' }}>{formatCurrency(amount||0, cur)}</td>
                    </tr>
                  ))}
                  <tr style={{ background:'#f7f9fc', borderTop:'2px solid #e3e3e6' }}>
                    <td colSpan={2} style={{ padding:'13px 20px', fontWeight:700, fontSize:15 }}>Total arrears</td>
                    <td style={{ padding:'13px 20px', textAlign:'right', fontWeight:700, fontSize:18, color:'#28a745', fontVariantNumeric:'tabular-nums' }}>{formatCurrency(result.totalArrears||0, cur)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {!applied && (
              <button onClick={() => applyMut.mutate(buildBody())} disabled={applyMut.isPending}
                style={{ width:'100%', padding:'13px 0', background:'#28a745', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {applyMut.isPending ? 'Applying…' : `Apply revision & add ${formatCurrency(result.totalArrears||0, cur)} arrears to next payrun →`}
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

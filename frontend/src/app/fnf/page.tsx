'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import { employeesApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

function EmpPicker({ region, onSelect }: { region: string; onSelect: (e: any) => void }) {
  const [search, setSearch] = useState(''); const [show, setShow] = useState(false); const [sel, setSel] = useState<any>(null);
  const { data } = useQuery({ queryKey:['emp-search',search,region], queryFn:()=>employeesApi.getAll({region,search,limit:10}), enabled:search.length>=1 });
  const emps = (data as any)?.data||[];
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;
  const pick = (e: any) => { setSel(e); setShow(false); setSearch(''); onSelect(e); };
  const clear = () => { setSel(null); setSearch(''); onSelect(null); };
  return (
    <div style={{ position:'relative' }}>
      {sel ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', border:'1px solid #0a84ff', borderRadius:9, background:'#e8f1fe' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:700 }}>{sel.firstName?.[0]}{sel.lastName?.[0]}</div>
            <div><div style={{ fontSize:13.5, fontWeight:600 }}>{sel.firstName} {sel.lastName}</div><div style={{ fontSize:11.5, color:'#6e6e73' }}>{sel.employeeCode} · {sel.designation}</div></div>
          </div>
          <button onClick={clear} style={{ background:'none', border:'none', color:'#6e6e73', cursor:'pointer', fontSize:18 }}>×</button>
        </div>
      ) : (
        <>
          <input style={inp} placeholder="Search employee…" value={search} onChange={e=>{setSearch(e.target.value);setShow(true);}} onFocus={()=>setShow(true)} autoComplete="off" />
          {show && search.length>=1 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e3e3e6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, maxHeight:200, overflowY:'auto', marginTop:4 }}>
              {emps.length===0?<div style={{ padding:16, textAlign:'center', color:'#a1a1a6', fontSize:13 }}>No employees found</div>
              :emps.map((e:any)=>(
                <div key={e.id} onClick={()=>pick(e)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f5f5f7' }} onMouseEnter={ev=>(ev.currentTarget.style.background='#f7f9fc')} onMouseLeave={ev=>(ev.currentTarget.style.background='')}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:700 }}>{e.firstName?.[0]}{e.lastName?.[0]}</div>
                  <div><div style={{ fontSize:13.5, fontWeight:600 }}>{e.firstName} {e.lastName}</div><div style={{ fontSize:11.5, color:'#a1a1a6' }}>{e.employeeCode} · {e.designation}</div></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FnFPage() {
  const { region } = useRegionStore();
  const [emp, setEmp] = useState<any>(null);
  const [lwd, setLwd] = useState('');
  const [result, setResult] = useState<any>(null);
  const [processed, setProcessed] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const calcMut = useMutation({ mutationFn: (body: any) => api.post('/fnf/calculate', body).then(r => r.data), onSuccess: setResult });
  const procMut = useMutation({ mutationFn: (body: any) => api.post('/fnf/process', body).then(r => r.data), onSuccess: (d: any) => { setResult(d); setProcessed(true); setConfirm(false); } });

  const cur = result?.currency || (region === 'UAE' ? 'AED' : 'INR');

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Full & Final Settlement</h1>
        <p style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>Calculate and process employee exit settlement</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '380px 1fr' : '1fr', gap: 20, alignItems: 'start', maxWidth: result ? 1200 : 600 }}>
        {/* Input panel */}
        <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Employee details</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>Employee</label>
            <EmpPicker region={region} onSelect={setEmp} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>Last working day</label>
            <input type="date" value={lwd} onChange={e => setLwd(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <button onClick={() => calcMut.mutate({ employeeId: emp?.id, lastWorkingDate: lwd })} disabled={!emp || !lwd || calcMut.isPending}
            style={{ width: '100%', padding: '11px 0', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (!emp || !lwd) ? .5 : 1 }}>
            {calcMut.isPending ? 'Calculating…' : 'Calculate settlement'}
          </button>
          <div style={{ marginTop: 16, background: '#fdf3e0', borderRadius: 10, padding: '11px 14px', fontSize: 12.5, color: '#c77700' }}>
            ⚠️ Processing FnF will mark the employee as <strong>INACTIVE</strong> and close all active loans. This cannot be undone.
          </div>
        </div>

        {/* Result panel */}
        {result && (
          <div>
            {/* Header */}
            <div style={{ background: processed ? 'linear-gradient(135deg,#28a745,#1a7f37)' : 'linear-gradient(135deg,#0a84ff,#0055cc)', borderRadius: 14, padding: '24px 28px', color: '#fff', marginBottom: 16 }}>
              <div style={{ fontSize: 13, opacity: .8, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {processed ? '✅ Settlement Processed' : 'Settlement calculation'}
              </div>
              <div style={{ fontSize: 14, opacity: .85, marginBottom: 12 }}>{result.employee?.name} · {result.employee?.employeeCode}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <div><div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>TOTAL PAYABLE</div><div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(result.totalPayable||0, cur)}</div></div>
                <div><div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>TOTAL RECOVERY</div><div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(result.totalRecoverable||0, cur)}</div></div>
                <div><div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>NET SETTLEMENT</div><div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(result.netSettlement||0, cur)}</div></div>
              </div>
            </div>

            {/* Service info */}
            <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>Service details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  ['Joining date', new Date(result.employee?.joiningDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})],
                  ['Last working day', new Date(result.lastWorkingDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})],
                  ['Total service', `${result.service?.months}m ${result.service?.remDays}d`],
                  ['Years (decimal)', result.service?.totalYears],
                ].map(([k,v]) => (
                  <div key={k}><div style={{ fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 16 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e3e3e6', fontSize: 15, fontWeight: 600 }}>Settlement breakdown</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #e3e3e6' }}>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>Component</th>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>Calculation</th>
                  <th style={{ padding: '10px 18px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>Amount</th>
                </tr></thead>
                <tbody>
                  {[
                    ['Pro-rata salary', result.breakdown?.proRataSalary?.note, result.breakdown?.proRataSalary?.amount, false],
                    ['Leave encashment', result.breakdown?.leaveEncashment?.note, result.breakdown?.leaveEncashment?.amount, false],
                    ['Gratuity', result.breakdown?.gratuity?.note, result.breakdown?.gratuity?.amount, false],
                    ['Loan recovery', result.breakdown?.loanRecovery?.note, result.breakdown?.loanRecovery?.amount, true],
                    ['Advance recovery', result.breakdown?.advanceRecovery?.note, result.breakdown?.advanceRecovery?.amount, true],
                  ].map(([comp, note, amount, deduct]: any) => (
                    <tr key={comp} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 500 }}>{comp}</td>
                      <td style={{ padding: '12px 18px', color: '#6e6e73', fontSize: 12.5 }}>{note}</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: deduct ? '#d83933' : '#28a745' }}>
                        {deduct ? '−' : ''}{formatCurrency(Math.abs(amount||0), cur)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f7f9fc', borderTop: '2px solid #e3e3e6' }}>
                    <td colSpan={2} style={{ padding: '14px 18px', fontWeight: 700, fontSize: 15 }}>Net settlement</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums', color: (result.netSettlement||0) >= 0 ? '#28a745' : '#d83933' }}>{formatCurrency(result.netSettlement||0, cur)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {!processed && (
              !confirm ? (
                <button onClick={() => setConfirm(true)} style={{ width: '100%', padding: '13px 0', background: '#d83933', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Process Full & Final Settlement →
                </button>
              ) : (
                <div style={{ background: '#fdecea', border: '1px solid #fcc', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#d83933', marginBottom: 10 }}>⚠️ Confirm FnF processing</div>
                  <div style={{ fontSize: 13.5, color: '#48484a', marginBottom: 16 }}>
                    This will permanently mark <strong>{result.employee?.name}</strong> as INACTIVE, close all active loans, and record the settlement. Are you sure?
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setConfirm(false)} style={{ padding: '9px 18px', background: '#fff', border: '1px solid #d2d2d6', borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={() => procMut.mutate({ employeeId: emp?.id, lastWorkingDate: lwd })} disabled={procMut.isPending}
                      style={{ padding: '9px 20px', background: '#d83933', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {procMut.isPending ? 'Processing…' : 'Yes, process FnF'}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

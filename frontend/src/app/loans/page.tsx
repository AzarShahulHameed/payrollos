'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { loansApi, employeesApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
 
const ST: Record<string,{bg:string;color:string}> = { PENDING:{bg:'#fdf3e0',color:'#c77700'}, ACTIVE:{bg:'#e7f6ea',color:'#28a745'}, CLOSED:{bg:'#f2f2f7',color:'#6e6e73'}, REJECTED:{bg:'#fdecea',color:'#d83933'} };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
export default function LoansPage() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const cur = region === 'UAE' ? 'AED' : 'INR';
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
 
  const { data: loans = [], isLoading } = useQuery({ queryKey:['loans', filter], queryFn:()=>loansApi.getAll({ status: filter==='ALL'?undefined:filter }) });
  const approveMut = useMutation({ mutationFn:(id:string)=>loansApi.approve(id), onSuccess:()=>qc.invalidateQueries({queryKey:['loans']}) });
  const [submitErr, setSubmitErr] = useState('');
  const createMut  = useMutation({
    mutationFn: (dto:any)=>loansApi.create(dto),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['loans']}); setShowModal(false); setSubmitErr(''); },
    onError: (e:any)=>setSubmitErr(e?.response?.data?.message || 'Submission failed'),
  });
 
  return (
    <AppLayout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>Loans</h1>
          <p style={{ fontSize:14, color:'#6e6e73', marginTop:4 }}>Employee loan management · {region}</p>
        </div>
        <button onClick={()=>setShowModal(true)} style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>+ New loan</button>
      </div>
 
      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {['ALL','PENDING','ACTIVE','CLOSED'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 16px', border:`1px solid ${filter===f?'#0a84ff':'#d2d2d6'}`, borderRadius:9, fontSize:13.5, fontWeight:500, fontFamily:'inherit', background:filter===f?'#0a84ff':'#fff', color:filter===f?'#fff':'#6e6e73', cursor:'pointer', transition:'all .12s' }}>
            {f.charAt(0)+f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
 
      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:16, alignItems:'start' }}>
        <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #e3e3e6', background:'#fafafa' }}>
                {['Employee','Amount','EMI','Installments','Status',''].map(h=>(
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'#a1a1a6' }}>Loading…</td></tr>
              : (loans as any[]).length===0 ? (
                <tr><td colSpan={6}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>💳</div>
                    <div style={{ fontSize:15, fontWeight:600 }}>No loans found</div>
                    <div style={{ fontSize:13.5, color:'#a1a1a6', marginTop:5 }}>Create a loan request to get started</div>
                  </div>
                </td></tr>
              ) : (loans as any[]).map((l:any)=>{
                const st = ST[l.status]||ST.CLOSED;
                const emi = l.amount && l.installments ? Math.round(l.amount/l.installments*100)/100 : 0;
                return (
                  <tr key={l.id} style={{ borderBottom:'1px solid rgba(0,0,0,.04)', background:selected?.id===l.id?'#f0f7ff':'', cursor:'pointer', transition:'background .1s' }}
                    onClick={()=>setSelected(l===selected?null:l)}
                    onMouseEnter={e=>selected?.id!==l.id&&(e.currentTarget.style.background='#f7f9fc')}
                    onMouseLeave={e=>selected?.id!==l.id&&(e.currentTarget.style.background='')}>
                    <td style={{ padding:'12px 18px' }}>
                      <div style={{ fontWeight:600 }}>{l.employee?.firstName} {l.employee?.lastName}</div>
                      <div style={{ fontSize:11.5, color:'#a1a1a6', marginTop:1 }}>{l.employee?.department?.name || l.employee?.employeeCode}</div>
                    </td>
                    <td style={{ padding:'12px 18px', fontVariantNumeric:'tabular-nums', fontWeight:600 }}>{formatCurrency(l.amount,cur)}</td>
                    <td style={{ padding:'12px 18px', fontVariantNumeric:'tabular-nums', color:'#6e6e73' }}>{formatCurrency(emi,cur)}</td>
                    <td style={{ padding:'12px 18px', color:'#6e6e73' }}>{l.installments} months</td>
                    <td style={{ padding:'12px 18px' }}><span style={{ ...st, fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:999 }}>{l.status}</span></td>
                    <td style={{ padding:'12px 18px' }}>
                      {l.status==='PENDING'&&<button onClick={e=>{e.stopPropagation();approveMut.mutate(l.id)}} style={{ padding:'5px 12px', background:'#e7f6ea', color:'#28a745', border:'none', borderRadius:7, fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Approve</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
 
        {selected && (
          <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e3e3e6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600 }}>Installment schedule</div>
                <div style={{ fontSize:12.5, color:'#a1a1a6', marginTop:2 }}>{selected.employee?.firstName} {selected.employee?.lastName} · {formatCurrency(selected.amount,cur)} over {selected.installments} months</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid #e3e3e6' }}>
              {[['Principal',formatCurrency(selected.amount,cur)],['Monthly EMI',formatCurrency(Math.round(selected.amount/selected.installments*100)/100,cur)],['Remaining',formatCurrency(selected.remainingAmount??selected.amount,cur)]].map(([l,v])=>(
                <div key={l} style={{ padding:'12px 16px', borderRight:'1px solid #e3e3e6' }}>
                  <div style={{ fontSize:11, color:'#a1a1a6', marginBottom:4, textTransform:'uppercase', letterSpacing:'.04em', fontWeight:600 }}>{l}</div>
                  <div style={{ fontSize:15, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{v}</div>
                </div>
              ))}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
              <thead><tr style={{ borderBottom:'1px solid #e3e3e6', background:'#fafafa' }}>
                <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em' }}>Month</th>
                <th style={{ padding:'10px 16px', textAlign:'right', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em' }}>EMI</th>
                <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em' }}>Status</th>
              </tr></thead>
              <tbody>
                {(selected.installmentsList||[]).map((inst:any,i:number)=>(
                  <tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,.04)' }}>
                    <td style={{ padding:'11px 16px', color:'#6e6e73' }}>{MONTHS[(inst.month||1)-1]} {inst.year}</td>
                    <td style={{ padding:'11px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{formatCurrency(inst.amount,cur)}</td>
                    <td style={{ padding:'11px 16px' }}><span style={{ ...(ST[inst.status?.toUpperCase()]||ST.PENDING), fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:999 }}>{inst.status||'PENDING'}</span></td>
                  </tr>
                ))}
                {!(selected.installmentsList||[]).length&&<tr><td colSpan={3} style={{ padding:16, textAlign:'center', color:'#a1a1a6', fontSize:13 }}>Schedule generated on approval</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
 
      {showModal && <LoanModal cur={cur} region={region} onClose={()=>setShowModal(false)} onSave={(dto:any)=>createMut.mutate(dto)} saving={createMut.isPending} />}
    </AppLayout>
  );
}
 
function EmpPicker({ region, onSelect }: { region: string; onSelect: (emp: any) => void }) {
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<any>(null);
 
  const { data } = useQuery({
    queryKey: ['emp-search', search, region],
    queryFn: () => employeesApi.getAll({ region, search, limit: 10 }),
    enabled: search.length >= 1,
  });
  const employees = (data as any)?.data || [];
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;
 
  const pick = (emp: any) => { setSelected(emp); setShow(false); setSearch(''); onSelect(emp); };
  const clear = () => { setSelected(null); setSearch(''); onSelect(null); };
 
  return (
    <div style={{ position:'relative' }}>
      {selected ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', border:'1px solid #0a84ff', borderRadius:9, background:'#e8f1fe' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:700 }}>
              {selected.firstName?.[0]}{selected.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontSize:13.5, fontWeight:600, color:'#1d1d1f' }}>{selected.firstName} {selected.lastName}</div>
              <div style={{ fontSize:11.5, color:'#6e6e73' }}>{selected.employeeCode} · {selected.designation}</div>
            </div>
          </div>
          <button onClick={clear} style={{ background:'none', border:'none', color:'#6e6e73', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>
      ) : (
        <>
          <input style={inp} placeholder="Search employee by name…" value={search}
            onChange={e=>{ setSearch(e.target.value); setShow(true); }} onFocus={()=>setShow(true)} autoComplete="off" />
          {show && search.length >= 1 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e3e3e6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, maxHeight:220, overflowY:'auto', marginTop:4 }}>
              {employees.length === 0
                ? <div style={{ padding:'16px', textAlign:'center', color:'#a1a1a6', fontSize:13 }}>No employees found</div>
                : employees.map((emp: any) => (
                  <div key={emp.id} onClick={()=>pick(emp)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f5f5f7' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {emp.firstName?.[0]}{emp.lastName?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:600 }}>{emp.firstName} {emp.lastName}</div>
                      <div style={{ fontSize:11.5, color:'#a1a1a6' }}>{emp.employeeCode} · {emp.designation} · {emp.department?.name||'—'}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}
 
function LoanModal({ cur, region, onClose, onSave, saving }: any) {
  const [emp, setEmp] = useState<any>(null);
  const [form, setForm] = useState({ amount:'', installments:12, purpose:'' });
  const s = (k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const emi = form.amount && form.installments ? Math.round(+form.amount/+form.installments*100)/100 : 0;
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;
 
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:18, width:460, boxShadow:'0 18px 50px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #e3e3e6' }}>
          <div style={{ fontSize:17, fontWeight:700 }}>New loan request</div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:22 }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Employee</label>
            <EmpPicker region={region} onSelect={setEmp} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Loan amount ({cur})</label><input style={inp} type="number" value={form.amount} onChange={e=>s('amount',e.target.value)} /></div>
            <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Installments (months)</label><input style={inp} type="number" min="1" max="60" value={form.installments} onChange={e=>s('installments',+e.target.value)} /></div>
          </div>
          {emi > 0 && <div style={{ background:'#e7f6ea', borderRadius:9, padding:'9px 14px', fontSize:13, color:'#28a745', fontWeight:600, marginBottom:14, display:'flex', justifyContent:'space-between' }}><span>Monthly EMI</span><span>{cur} {emi.toLocaleString()}</span></div>}
          <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Purpose</label><textarea style={{ ...inp, minHeight:64, resize:'vertical' } as any} value={form.purpose} onChange={e=>s('purpose',e.target.value)} /></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'16px 22px', borderTop:'1px solid #e3e3e6', background:'#fafafa', borderRadius:'0 0 18px 18px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button
            onClick={()=>{
              if (!emp?.id) return;
              onSave({
                employeeId:   emp.id,
                amount:       parseFloat(form.amount),
                installments: parseInt(String(form.installments), 10),
                purpose:      form.purpose || undefined,
              });
            }}
            disabled={saving||!emp||!form.amount}
            style={{ padding:'8px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:(!emp||!form.amount)?0.5:1 }}>
            {saving?'Submitting…':'Submit loan'}
          </button>
        </div>
      </div>
    </div>
  );
}
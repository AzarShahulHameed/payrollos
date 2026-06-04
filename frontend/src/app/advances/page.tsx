'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { advancesApi, employeesApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
 
const ST: Record<string,{bg:string;color:string}> = { PENDING:{bg:'#fdf3e0',color:'#c77700'}, APPROVED:{bg:'#e7f6ea',color:'#28a745'}, DEDUCTED:{bg:'#e8f1fe',color:'#0a84ff'}, REJECTED:{bg:'#fdecea',color:'#d83933'} };
const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
 
function EmpPicker({ region, onSelect }: { region: string; onSelect: (emp: any) => void }) {
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const { data } = useQuery({ queryKey:['emp-search',search,region], queryFn:()=>employeesApi.getAll({region,search,limit:10}), enabled:search.length>=1 });
  const employees = (data as any)?.data||[];
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;
  const pick = (emp: any) => { setSelected(emp); setShow(false); setSearch(''); onSelect(emp); };
  const clear = () => { setSelected(null); setSearch(''); onSelect(null); };
  return (
    <div style={{ position:'relative' }}>
      {selected ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', border:'1px solid #0a84ff', borderRadius:9, background:'#e8f1fe' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:700 }}>{selected.firstName?.[0]}{selected.lastName?.[0]}</div>
            <div><div style={{ fontSize:13.5, fontWeight:600, color:'#1d1d1f' }}>{selected.firstName} {selected.lastName}</div><div style={{ fontSize:11.5, color:'#6e6e73' }}>{selected.employeeCode} · {selected.designation}</div></div>
          </div>
          <button onClick={clear} style={{ background:'none', border:'none', color:'#6e6e73', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>
      ) : (
        <>
          <input style={inp} placeholder="Search employee by name…" value={search} onChange={e=>{setSearch(e.target.value);setShow(true);}} onFocus={()=>setShow(true)} autoComplete="off" />
          {show && search.length>=1 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e3e3e6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, maxHeight:220, overflowY:'auto', marginTop:4 }}>
              {employees.length===0 ? <div style={{ padding:'16px', textAlign:'center', color:'#a1a1a6', fontSize:13 }}>No employees found</div>
              : employees.map((emp:any)=>(
                <div key={emp.id} onClick={()=>pick(emp)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f5f5f7' }} onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
                  <div><div style={{ fontSize:13.5, fontWeight:600 }}>{emp.firstName} {emp.lastName}</div><div style={{ fontSize:11.5, color:'#a1a1a6' }}>{emp.employeeCode} · {emp.designation} · {emp.department?.name||'—'}</div></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
 
export default function AdvancesPage() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const cur = region==='UAE'?'AED':'INR';
  const [showModal, setShowModal] = useState(false);
  const { data: advances=[], isLoading } = useQuery({ queryKey:['advances'], queryFn:()=>advancesApi.getAll({}) });
  const approveMut = useMutation({ mutationFn:(id:string)=>advancesApi.approve(id), onSuccess:()=>qc.invalidateQueries({queryKey:['advances']}) });
  const [submitErr, setSubmitErr] = useState('');
  const createMut  = useMutation({
    mutationFn: (dto:any)=>advancesApi.create(dto),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['advances']}); setShowModal(false); setSubmitErr(''); },
    onError: (e:any)=>setSubmitErr(e?.response?.data?.message || 'Submission failed'),
  });
 
  return (
    <AppLayout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div><h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>Salary advances</h1><p style={{ fontSize:14, color:'#6e6e73', marginTop:4 }}>Advance deducted in next month's payroll · {region}</p></div>
        <button onClick={()=>setShowModal(true)} style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>+ New advance</button>
      </div>
      <div style={{ background:'#e8f1fe', border:'1px solid rgba(10,132,255,.2)', borderRadius:10, padding:'11px 16px', fontSize:13, color:'#0055b0', marginBottom:18, display:'flex', gap:10, alignItems:'center' }}>
        <span>ℹ️</span><span>Advances are automatically deducted from the employee's next month payroll during the pay run.</span>
      </div>
      <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
          <thead><tr style={{ borderBottom:'1px solid #e3e3e6', background:'#fafafa' }}>
            {['Employee','Amount','Requested on','Deduction month','Status','Actions'].map(h=>(<th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>))}
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'#a1a1a6' }}>Loading…</td></tr>
            : (advances as any[]).length===0 ? (
              <tr><td colSpan={6}><div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 24px', textAlign:'center' }}><div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>💵</div><div style={{ fontSize:15, fontWeight:600 }}>No advance requests</div><div style={{ fontSize:13.5, color:'#a1a1a6', marginTop:5 }}>Employee advance requests will appear here</div></div></td></tr>
            ) : (advances as any[]).map((a:any)=>{
              const st = ST[a.status]||ST.PENDING;
              return (
                <tr key={a.id} style={{ borderBottom:'1px solid rgba(0,0,0,.04)', transition:'background .1s' }} onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={{ padding:'12px 18px' }}><div style={{ fontWeight:600 }}>{a.employee?.firstName} {a.employee?.lastName}</div><div style={{ fontSize:11.5, color:'#a1a1a6', marginTop:1 }}>{a.employee?.department?.name||a.employee?.employeeCode}</div></td>
                  <td style={{ padding:'12px 18px', fontVariantNumeric:'tabular-nums', fontWeight:700, fontSize:14 }}>{formatCurrency(a.amount,cur)}</td>
                  <td style={{ padding:'12px 18px', color:'#6e6e73' }}>{new Date(a.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{ padding:'12px 18px', fontWeight:500 }}>{MONTHS_L[(a.deductionMonth||1)-1]} {a.deductionYear}</td>
                  <td style={{ padding:'12px 18px' }}><span style={{ ...st, fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:999 }}>{a.status}</span></td>
                  <td style={{ padding:'12px 18px' }}>{a.status==='PENDING'&&<button onClick={()=>approveMut.mutate(a.id)} style={{ padding:'5px 12px', background:'#e7f6ea', color:'#28a745', border:'none', borderRadius:7, fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Approve</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal && <AdvanceModal cur={cur} region={region} onClose={()=>setShowModal(false)} onSave={(dto:any)=>createMut.mutate(dto)} saving={createMut.isPending} />}
    </AppLayout>
  );
}
 
function AdvanceModal({ cur, region, onClose, onSave, saving }: any) {
  const now = new Date();
  const [emp, setEmp] = useState<any>(null);
  const [form, setForm] = useState({ amount:'', reason:'', deductionMonth: now.getMonth()+2>12?1:now.getMonth()+2, deductionYear: now.getMonth()+2>12?now.getFullYear()+1:now.getFullYear() });
  const s = (k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:18, width:460, boxShadow:'0 18px 50px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #e3e3e6' }}>
          <div style={{ fontSize:17, fontWeight:700 }}>New advance request</div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:22 }}>
          <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Employee</label><EmpPicker region={region} onSelect={setEmp} /></div>
          <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Amount ({cur})</label><input style={inp} type="number" value={form.amount} onChange={e=>s('amount',e.target.value)} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Deduction month</label>
              <select style={inp} value={form.deductionMonth} onChange={e=>s('deductionMonth',+e.target.value)}>
                {MONTHS_L.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Year</label><input style={inp} type="number" value={form.deductionYear} onChange={e=>s('deductionYear',+e.target.value)} /></div>
          </div>
          <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Reason</label><textarea style={{ ...inp, minHeight:64, resize:'vertical' } as any} value={form.reason} onChange={e=>s('reason',e.target.value)} /></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'16px 22px', borderTop:'1px solid #e3e3e6', background:'#fafafa', borderRadius:'0 0 18px 18px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button
    onClick={()=>{
      if (!emp?.id) return;
      onSave({
        employeeId:     emp.id,
        amount:         parseFloat(form.amount),
        reason:         form.reason || undefined,
        deductionMonth: parseInt(String(form.deductionMonth), 10),
        deductionYear:  parseInt(String(form.deductionYear), 10),
      });
    }}
    disabled={saving||!emp||!form.amount}
    style={{ padding:'8px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:(!emp||!form.amount)?0.5:1 }}>
            {saving?'Submitting…':'Submit advance'}
          </button>
        </div>
      </div>
    </div>
  );
}
 
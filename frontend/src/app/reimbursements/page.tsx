'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { reimbursementsApi, employeesApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
 
const ST: Record<string,{bg:string;color:string}> = { PENDING:{bg:'#fdf3e0',color:'#c77700'}, APPROVED:{bg:'#e7f6ea',color:'#28a745'}, REJECTED:{bg:'#fdecea',color:'#d83933'}, PAID:{bg:'#e8f1fe',color:'#0a84ff'} };
const CATEGORIES = ['Travel','Accommodation','Meals','Medical','Training','Equipment','Communication','Other'];
 
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
 
export default function ReimbursementsPage() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const cur = region==='UAE'?'AED':'INR';
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
 
  const { data:items=[], isLoading } = useQuery({ queryKey:['reimb',filter], queryFn:()=>reimbursementsApi.getAll({status:filter==='ALL'?undefined:filter}) });
  const { data:stats } = useQuery({ queryKey:['reimb-stats'], queryFn:()=>reimbursementsApi.getStats() });
  const approveMut = useMutation({ mutationFn:(id:string)=>reimbursementsApi.approve(id), onSuccess:()=>qc.invalidateQueries({queryKey:['reimb']}) });
  const rejectMut  = useMutation({ mutationFn:({id,reason}:any)=>reimbursementsApi.reject(id,reason), onSuccess:()=>qc.invalidateQueries({queryKey:['reimb']}) });
  const [submitErr, setSubmitErr] = useState('');
  const createMut  = useMutation({
    mutationFn: (dto:any)=>reimbursementsApi.create(dto),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['reimb']}); setShowModal(false); setSubmitErr(''); },
    onError: (e:any)=>setSubmitErr(e?.response?.data?.message || 'Submission failed'),
  });
 
  return (
    <AppLayout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div><h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>Reimbursements</h1><p style={{ fontSize:14, color:'#6e6e73', marginTop:4 }}>Employee expense reimbursements · {region}</p></div>
        <button onClick={()=>setShowModal(true)} style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>+ New request</button>
      </div>
 
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[['Total requests',stats.total,'#1d1d1f','#f7f9fc'],['Pending approval',stats.pending,'#c77700','#fdf3e0'],['Approved',stats.approved,'#28a745','#e7f6ea'],['Total approved amount',formatCurrency(stats.totalAmount,cur),'#0a84ff','#e8f1fe']].map(([lbl,val,color,bg])=>(
            <div key={lbl as string} style={{ background:bg as string, border:'1px solid #e3e3e6', borderRadius:14, padding:'16px 18px' }}>
              <div style={{ fontSize:22, fontWeight:700, color:color as string, fontVariantNumeric:'tabular-nums' }}>{val}</div>
              <div style={{ fontSize:12.5, color:'#6e6e73', marginTop:5, fontWeight:500 }}>{lbl}</div>
            </div>
          ))}
        </div>
      )}
 
      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {['ALL','PENDING','APPROVED','REJECTED','PAID'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 16px', border:`1px solid ${filter===f?'#0a84ff':'#d2d2d6'}`, borderRadius:9, fontSize:13.5, fontWeight:500, fontFamily:'inherit', background:filter===f?'#0a84ff':'#fff', color:filter===f?'#fff':'#6e6e73', cursor:'pointer', transition:'all .12s' }}>
            {f.charAt(0)+f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
 
      <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
          <thead><tr style={{ borderBottom:'1px solid #e3e3e6', background:'#fafafa' }}>
            {['Employee','Category','Amount','Description','Requested on','Status','Actions'].map(h=>(<th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>))}
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#a1a1a6' }}>Loading…</td></tr>
            : (items as any[]).length===0 ? (
              <tr><td colSpan={7}><div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 24px', textAlign:'center' }}><div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>🧾</div><div style={{ fontSize:15, fontWeight:600 }}>No reimbursement requests</div><div style={{ fontSize:13.5, color:'#a1a1a6', marginTop:5 }}>Submit expense reimbursements for approval</div></div></td></tr>
            ) : (items as any[]).map((item:any)=>{
              const st = ST[item.status]||ST.PENDING;
              return (
                <tr key={item.id} style={{ borderBottom:'1px solid rgba(0,0,0,.04)', transition:'background .1s' }} onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={{ padding:'12px 18px' }}><div style={{ fontWeight:600 }}>{item.employee?.firstName} {item.employee?.lastName}</div><div style={{ fontSize:11.5, color:'#a1a1a6' }}>{item.employee?.department?.name||item.employee?.employeeCode}</div></td>
                  <td style={{ padding:'12px 18px' }}><span style={{ background:'#f2f2f7', color:'#6e6e73', fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:999 }}>{item.category}</span></td>
                  <td style={{ padding:'12px 18px', fontVariantNumeric:'tabular-nums', fontWeight:700, fontSize:14 }}>{formatCurrency(item.amount,cur)}</td>
                  <td style={{ padding:'12px 18px', color:'#6e6e73', maxWidth:200 }}><div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.description||'—'}</div></td>
                  <td style={{ padding:'12px 18px', color:'#6e6e73' }}>{new Date(item.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{ padding:'12px 18px' }}><span style={{ ...st, fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:999 }}>{item.status}</span></td>
                  <td style={{ padding:'12px 18px' }}>
                    {item.status==='PENDING' && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={()=>approveMut.mutate(item.id)} style={{ padding:'5px 11px', background:'#e7f6ea', color:'#28a745', border:'none', borderRadius:7, fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Approve</button>
                        <button onClick={()=>rejectMut.mutate({id:item.id,reason:'Declined'})} style={{ padding:'5px 11px', background:'#fdecea', color:'#d83933', border:'none', borderRadius:7, fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
 
      {showModal && <ReimbModal cur={cur} region={region} onClose={()=>setShowModal(false)} onSave={(dto:any)=>createMut.mutate(dto)} saving={createMut.isPending} />}
    </AppLayout>
  );
}
 
function ReimbModal({ cur, region, onClose, onSave, saving }: any) {
  const [emp, setEmp] = useState<any>(null);
  const [form, setForm] = useState({ category:'Travel', amount:'', description:'', receiptUrl:'' });
  const s = (k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:18, width:460, boxShadow:'0 18px 50px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #e3e3e6' }}>
          <div style={{ fontSize:17, fontWeight:700 }}>New reimbursement request</div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:22 }}>
          <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Employee</label><EmpPicker region={region} onSelect={setEmp} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Category</label>
              <select style={inp} value={form.category} onChange={e=>s('category',e.target.value)}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Amount ({cur})</label><input style={inp} type="number" value={form.amount} onChange={e=>s('amount',e.target.value)} /></div>
          </div>
          <div style={{ marginBottom:14 }}><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Description</label><textarea style={{ ...inp, minHeight:72, resize:'vertical' } as any} value={form.description} onChange={e=>s('description',e.target.value)} placeholder="Expense details…" /></div>
          <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Receipt URL (optional)</label><input style={inp} value={form.receiptUrl} onChange={e=>s('receiptUrl',e.target.value)} placeholder="https://…" /></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'16px 22px', borderTop:'1px solid #e3e3e6', background:'#fafafa', borderRadius:'0 0 18px 18px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button
          onClick={()=>{
            if (!emp?.id) return;
            onSave({
              employeeId:  emp.id,
              category:    form.category,
              amount:      parseFloat(form.amount),
              description: form.description || undefined,
              receiptUrl:  form.receiptUrl  || undefined,
            });
          }}
          disabled={saving||!emp||!form.amount}
          style={{ padding:'8px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:(!emp||!form.amount)?0.5:1 }}>
            {saving?'Submitting…':'Submit request'}
          </button>
        </div>
      </div>
    </div>
  );
}
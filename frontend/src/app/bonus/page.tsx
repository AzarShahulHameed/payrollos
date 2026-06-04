'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api, employeesApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency, initials } from '@/lib/utils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BONUS_TYPES = ['PERFORMANCE','FESTIVAL','ANNUAL','REFERRAL','RETENTION','PROJECT','OTHER'];

function EmpPicker({ region, selected, onSelect }: any) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey:['emp-bonus',q,region], queryFn:()=>employeesApi.getAll({region,search:q,limit:8}), enabled:q.length>=1 });
  const emps = (data as any)?.data||[];
  const pick = (e:any) => { onSelect(e); setOpen(false); setQ(''); };
  const inp: React.CSSProperties = { width:'100%', height:36, padding:'0 12px', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'var(--surface)' };

  return (
    <div style={{ position:'relative' }}>
      {selected ? (
        <div style={{ display:'flex',alignItems:'center',gap:8,height:38,padding:'0 10px',border:'1.5px solid #0a84ff',borderRadius:9,background:'#e8f1fe' }}>
          <div style={{ width:22,height:22,borderRadius:'50%',background:'#0a84ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:9,fontWeight:700 }}>{initials(`${selected.firstName} ${selected.lastName}`)}</div>
          <span style={{ fontSize:13.5,fontWeight:600,flex:1,color:'#1d1d1f' }}>{selected.firstName} {selected.lastName}</span>
          <span style={{ fontSize:12,color:'#6e6e73' }}>{selected.employeeCode}</span>
          <button onClick={()=>onSelect(null)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#6e6e73' }}>×</button>
        </div>
      ) : (
        <>
          <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#a1a1a6',pointerEvents:'none' }}>⌕</span>
          <input style={{ ...inp, paddingLeft:28 }} placeholder="Search employee…" value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)} />
          {open && q.length>=1 && (
            <div style={{ position:'absolute',top:'100%',left:0,right:0,background:'var(--surface)',border:'1px solid var(--line)',borderRadius:10,boxShadow:'0 6px 24px rgba(0,0,0,.13)',zIndex:99,maxHeight:200,overflowY:'auto',marginTop:4 }}>
              {emps.length===0?<div style={{ padding:'14px 16px',color:'var(--ink-3)',fontSize:13,textAlign:'center' }}>No employees found</div>
              :emps.map((e:any)=>(
                <div key={e.id} onMouseDown={()=>pick(e)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer' }}
                  onMouseEnter={el=>(el.currentTarget.style.background='var(--bg)')} onMouseLeave={el=>(el.currentTarget.style.background='')}>
                  <div style={{ width:28,height:28,borderRadius:'50%',background:'#0a84ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:700,flexShrink:0 }}>{initials(`${e.firstName} ${e.lastName}`)}</div>
                  <div><div style={{ fontSize:13.5,fontWeight:600,color:'var(--ink)' }}>{e.firstName} {e.lastName}</div><div style={{ fontSize:11.5,color:'var(--ink-3)' }}>{e.employeeCode} · {e.designation}</div></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BonusPage() {
  const { region } = useRegionStore();
  const cur = region==='UAE'?'AED':'₹';
  const qc = useQueryClient();
  const now = new Date();
  const [showModal, setShowModal] = useState(false);
  const [emp, setEmp] = useState<any>(null);
  const [form, setForm] = useState({ type:'PERFORMANCE', amount:'', month:now.getMonth()+1, year:now.getFullYear(), description:'' });
  const s = (k:string,v:any) => setForm(p=>({...p,[k]:v}));
  const [filterMonth, setFilterMonth] = useState(now.getMonth()+1);
  const [filterYear, setFilterYear]   = useState(now.getFullYear());

  const { data: bonuses = [], isLoading } = useQuery({
    queryKey: ['bonus', filterMonth, filterYear],
    queryFn: () => api.get('/bonus', { params: { month: filterMonth, year: filterYear } }).then(r => r.data),
  });

  const createMut  = useMutation({ mutationFn:(d:any)=>api.post('/bonus',d).then(r=>r.data),       onSuccess:()=>{ qc.invalidateQueries({queryKey:['bonus']}); setShowModal(false); setEmp(null); setForm({type:'PERFORMANCE',amount:'',month:now.getMonth()+1,year:now.getFullYear(),description:''}); }, onError:(e:any)=>alert('Failed to save bonus: '+(e?.response?.data?.message||e?.message||'Run prisma migrate dev first')) });
  const approveMut = useMutation({ mutationFn:(id:string)=>api.patch(`/bonus/${id}/approve`).then(r=>r.data), onSuccess:()=>qc.invalidateQueries({queryKey:['bonus']}) });
  const removeMut  = useMutation({ mutationFn:(id:string)=>api.delete(`/bonus/${id}`).then(r=>r.data),        onSuccess:()=>qc.invalidateQueries({queryKey:['bonus']}) });

  const totalApproved = (bonuses as any[]).filter((b:any)=>b.status==='APPROVED').reduce((a:number,b:any)=>a+b.amount,0);
  const inp: React.CSSProperties = { width:'100%',padding:'9px 12px',border:'1px solid var(--line-2)',borderRadius:9,fontSize:13.5,fontFamily:'inherit',outline:'none',background:'var(--surface)',color:'var(--ink)' };
  const selStyle: React.CSSProperties = { ...inp, backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', WebkitAppearance:'none' as any, appearance:'none' as any };

  return (
    <AppLayout>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26,fontWeight:700,letterSpacing:'-.02em',color:'var(--ink)' }}>Bonus management</h1>
          <p style={{ fontSize:14,color:'var(--ink-3)',marginTop:4 }}>Grant one-time bonuses — added to that month's payrun</p>
        </div>
        <button onClick={()=>setShowModal(true)} style={{ padding:'10px 20px',background:'#0a84ff',color:'#fff',border:'none',borderRadius:10,fontSize:13.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>+ Grant bonus</button>
      </div>

      {/* Summary + filters */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20 }}>
        <div style={{ background:'var(--surface)',border:'1px solid var(--line)',borderRadius:14,padding:'16px 18px' }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:8 }}>Total approved</div>
          <div style={{ fontSize:22,fontWeight:700,color:'#28a745',fontVariantNumeric:'tabular-nums' }}>{formatCurrency(totalApproved,cur)}</div>
          <div style={{ fontSize:12,color:'var(--ink-3)',marginTop:4 }}>Will be added to payrun</div>
        </div>
        <div style={{ background:'var(--surface)',border:'1px solid var(--line)',borderRadius:14,padding:'16px 18px' }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:8 }}>Pending approval</div>
          <div style={{ fontSize:22,fontWeight:700,color:'#ff9500' }}>{(bonuses as any[]).filter((b:any)=>b.status==='PENDING').length}</div>
        </div>
        <div style={{ background:'var(--surface)',border:'1px solid var(--line)',borderRadius:14,padding:'16px 18px',display:'flex',gap:10,alignItems:'center' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:8 }}>Filter period</div>
            <div style={{ display:'flex',gap:8 }}>
              <select value={filterMonth} onChange={e=>setFilterMonth(+e.target.value)} style={{ ...selStyle,flex:1 }}>
                {MONTHS.map((m,i)=><option key={i} value={i+1}>{MONTHS_S[i]}</option>)}
              </select>
              <select value={filterYear} onChange={e=>setFilterYear(+e.target.value)} style={{ ...selStyle,width:80 }}>
                {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'var(--surface)',border:'1px solid var(--line)',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13.5 }}>
          <thead><tr style={{ borderBottom:'1px solid var(--line)',background:'var(--bg)' }}>
            {['Employee','Type','Month','Amount','Description','Status','Actions'].map(h=>(
              <th key={h} style={{ padding:'10px 16px',textAlign:h==='Amount'?'right':'left',fontSize:11,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.04em' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {isLoading?<tr><td colSpan={7} style={{ padding:32,textAlign:'center',color:'var(--ink-3)' }}>Loading…</td></tr>
            :(bonuses as any[]).length===0?(
              <tr><td colSpan={7}>
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'52px 24px',textAlign:'center' }}>
                  <div style={{ fontSize:40,opacity:.3,marginBottom:14 }}>🎁</div>
                  <div style={{ fontSize:15,fontWeight:600,color:'var(--ink)' }}>No bonuses for {MONTHS_S[filterMonth-1]} {filterYear}</div>
                  <div style={{ fontSize:13.5,color:'var(--ink-3)',marginTop:5 }}>Click "Grant bonus" to add one</div>
                </div>
              </td></tr>
            ):(bonuses as any[]).map((b:any)=>{
              const stC = b.status==='APPROVED'?{bg:'#e7f6ea',c:'#28a745'}:b.status==='PENDING'?{bg:'#fdf3e0',c:'#c77700'}:{bg:'#fdecea',c:'#d83933'};
              return (
                <tr key={b.id} style={{ borderBottom:'1px solid rgba(0,0,0,.04)' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ fontWeight:600,color:'var(--ink)' }}>{b.employee?.firstName} {b.employee?.lastName}</div>
                    <div style={{ fontSize:11.5,color:'var(--ink-3)' }}>{b.employee?.employeeCode}</div>
                  </td>
                  <td style={{ padding:'12px 16px' }}><span style={{ background:'var(--bg)',color:'var(--ink-2)',fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:999,border:'1px solid var(--line)' }}>{b.type}</span></td>
                  <td style={{ padding:'12px 16px',color:'var(--ink-2)' }}>{MONTHS_S[(b.month||1)-1]} {b.year}</td>
                  <td style={{ padding:'12px 16px',textAlign:'right',fontVariantNumeric:'tabular-nums',fontWeight:700,color:'#28a745' }}>{formatCurrency(b.amount,cur)}</td>
                  <td style={{ padding:'12px 16px',color:'var(--ink-3)',maxWidth:200 }}><div style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{b.description||'—'}</div></td>
                  <td style={{ padding:'12px 16px' }}><span style={{ background:stC.bg,color:stC.c,fontSize:11.5,fontWeight:600,padding:'3px 10px',borderRadius:999 }}>{b.status}</span></td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex',gap:6 }}>
                      {b.status==='PENDING'&&<button onClick={()=>approveMut.mutate(b.id)} style={{ padding:'4px 10px',background:'#e7f6ea',color:'#28a745',border:'none',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500 }}>✓ Approve</button>}
                      <button onClick={()=>removeMut.mutate(b.id)} style={{ padding:'4px 10px',background:'#fdecea',color:'#d83933',border:'none',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500 }}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',background:'rgba(0,0,0,.35)' }} onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={{ background:'var(--surface)',borderRadius:18,width:460,boxShadow:'0 18px 50px rgba(0,0,0,.2)' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid var(--line)' }}>
              <div style={{ fontSize:17,fontWeight:700,color:'var(--ink)' }}>Grant bonus</div>
              <button onClick={()=>setShowModal(false)} style={{ width:26,height:26,borderRadius:'50%',border:'none',background:'var(--bg)',cursor:'pointer',fontSize:16,color:'var(--ink-2)' }}>×</button>
            </div>
            <div style={{ padding:22 }}>
              {[
                { label:'Employee', node: <EmpPicker region={region} selected={emp} onSelect={setEmp} /> },
                { label:'Bonus type', node: <select style={selStyle} value={form.type} onChange={e=>s('type',e.target.value)}>{BONUS_TYPES.map(t=><option key={t}>{t}</option>)}</select> },
                { label:'Amount', node: <input style={inp} type="number" placeholder={`e.g. ${region==='UAE'?'1000':'10000'}`} value={form.amount} onChange={e=>s('amount',e.target.value)} /> },
              ].map(({label,node})=>(
                <div key={label} style={{ marginBottom:14 }}>
                  <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-3)',marginBottom:6 }}>{label}</label>
                  {node}
                </div>
              ))}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
                <div><label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-3)',marginBottom:6 }}>Month</label>
                  <select style={selStyle} value={form.month} onChange={e=>s('month',+e.target.value)}>{MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select>
                </div>
                <div><label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-3)',marginBottom:6 }}>Year</label>
                  <select style={selStyle} value={form.year} onChange={e=>s('year',+e.target.value)}>{[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select>
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-3)',marginBottom:6 }}>Description (optional)</label>
                <textarea style={{ ...inp,minHeight:64,resize:'vertical' } as any} placeholder="e.g. Q2 performance bonus" value={form.description} onChange={e=>s('description',e.target.value)} />
              </div>
              {createMut.isError && <div style={{ background:'#fdecea',borderRadius:9,padding:'10px 14px',fontSize:12.5,color:'#d83933',marginBottom:8 }}>⚠ {(createMut.error as any)?.response?.data?.message || 'Save failed — ensure the database migration has run: npx prisma migrate dev'}</div>}
              <div style={{ background:'#e8f1fe',borderRadius:9,padding:'10px 14px',fontSize:12.5,color:'#0a84ff',marginBottom:4 }}>
                ℹ️ Approved bonuses are automatically included in the selected month's payrun as additional earnings.
              </div>
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 22px',borderTop:'1px solid var(--line)',background:'var(--bg)',borderRadius:'0 0 18px 18px' }}>
              <button onClick={()=>setShowModal(false)} style={{ padding:'8px 16px',background:'var(--surface)',border:'1px solid var(--line-2)',borderRadius:8,fontSize:13.5,fontWeight:500,cursor:'pointer',fontFamily:'inherit',color:'var(--ink)' }}>Cancel</button>
              <button onClick={()=>{
                if (!emp) { alert('Please select an employee'); return; }
                if (!form.amount || isNaN(parseFloat(form.amount))) { alert('Please enter a valid amount'); return; }
                createMut.mutate({ employeeId:emp.id, type:form.type, amount:parseFloat(form.amount), month:Number(form.month), year:Number(form.year), description:form.description||undefined });
              }}
                disabled={!emp||!form.amount||createMut.isPending}
                style={{ padding:'8px 20px',background:'#0a84ff',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:(!emp||!form.amount)?0.5:1 }}>
                {createMut.isPending?'Saving…':'Grant bonus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

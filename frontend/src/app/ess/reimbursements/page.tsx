'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';

const CATEGORIES = ['Travel','Meals','Accommodation','Medical','Training','Equipment','Communication','Other'];
const STATUS: Record<string,{bg:string;color:string}> = {
  PENDING:{bg:'#fdf3e0',color:'#c77700'}, APPROVED:{bg:'#e7f6ea',color:'#28a745'},
  REJECTED:{bg:'#fdecea',color:'#d83933'}, PAID:{bg:'#f2f2f7',color:'#6e6e73'},
};

export default function ESSReimbursements() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount:'', category:'Travel', description:'', receiptUrl:'' });
  const s = (k:string,v:string) => setForm(p=>({...p,[k]:v}));
  const cur = user?.region==='INDIA'?'INR':'AED';

  const { data: reimbursements=[], isLoading } = useQuery({ queryKey:['my-reimbursements'], queryFn:()=>api.get('/reimbursements?myReimbursements=true').then(r=>r.data) });

  const createMut = useMutation({
    mutationFn: (dto:any) => api.post('/reimbursements', dto).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['my-reimbursements']}); setShowForm(false); setForm({amount:'',category:'Travel',description:'',receiptUrl:''}); },
    onError: (e:any) => alert(e?.response?.data?.message||'Request failed'),
  });

  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'var(--surface)', color:'var(--ink)' };

  return (
    <ESSLayout>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.01em', color:'var(--ink)' }}>Reimbursements</h1>
          <p style={{ fontSize:13.5, color:'var(--ink-3)', marginTop:4 }}>Submit expense claims for business-related costs.</p>
        </div>
        {!showForm && <button onClick={()=>setShowForm(true)} style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Submit claim</button>}
      </div>

      {showForm && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:24, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:18 }}>New expense claim</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Amount ({cur})</label>
              <input style={inp} type="number" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Category</label>
              <select style={inp} value={form.category} onChange={e=>s('category',e.target.value)}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Description</label>
            <textarea style={{ ...inp, minHeight:72, resize:'vertical' } as any} value={form.description} onChange={e=>s('description',e.target.value)} placeholder="Details of the expense" />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>createMut.mutate({ amount:+form.amount, category:form.category, description:form.description })} disabled={!form.amount||createMut.isPending}
              style={{ padding:'9px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {createMut.isPending?'Submitting…':'Submit claim'}
            </button>
            <button onClick={()=>setShowForm(false)} style={{ padding:'9px 20px', background:'var(--bg)', color:'var(--ink-2)', border:'1px solid var(--line)', borderRadius:8, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}><div className="table-scroll">
        {isLoading ? <div style={{ padding:40, textAlign:'center', color:'var(--ink-3)' }}>Loading…</div>
        : (reimbursements as any[]).length===0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No claims submitted</div>
            <div style={{ fontSize:13.5, color:'var(--ink-3)' }}>Submit your first expense claim above</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:'1px solid var(--line)' }}>
              {['Category','Amount','Description','Status','Date'].map((h,i)=>(
                <th key={h} style={{ padding:'10px 16px', textAlign:i>=3?'center':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(reimbursements as any[]).map((r:any)=>(
                <tr key={r.id} style={{ borderBottom:'1px solid var(--line)' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={{ padding:'13px 16px', fontWeight:500, color:'var(--ink)' }}>{r.category}</td>
                  <td style={{ padding:'13px 16px', fontWeight:600, color:'var(--ink)' }}>{formatCurrency(r.amount,cur)}</td>
                  <td style={{ padding:'13px 16px', color:'var(--ink-3)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.description||'—'}</td>
                  <td style={{ padding:'13px 16px', textAlign:'center' }}>
                    <span style={{ ...(STATUS[r.status]||STATUS.PENDING), fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:999 }}>{r.status}</span>
                  </td>
                  <td style={{ padding:'13px 16px', color:'var(--ink-3)', fontSize:12.5, textAlign:'center' }}>{new Date(r.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </ESSLayout>
  );
}

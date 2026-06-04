'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';

const STATUS: Record<string,{bg:string;color:string}> = {
  PENDING:  {bg:'#fdf3e0',color:'#c77700'},
  APPROVED: {bg:'#e7f6ea',color:'#28a745'},
  REJECTED: {bg:'#fdecea',color:'#d83933'},
  ACTIVE:   {bg:'#e8f1fe',color:'#0a84ff'},
  CLOSED:   {bg:'#f2f2f7',color:'#6e6e73'},
};

export default function ESSLoans() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount:'', months:'12', reason:'' });
  const s = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const { data: loans=[], isLoading } = useQuery({
    queryKey: ['my-loans'],
    queryFn: () => api.get('/loans', { params: { myLoans: 'true' } }).then(r=>r.data),
  });
  const { data: settings } = useQuery({ queryKey:['settings'], queryFn:()=>api.get('/settings').then(r=>r.data) });
  const maxAmount = (settings as any)?.maxLoanAmount || 100000;
  const maxMonths = (settings as any)?.maxInstallments || 24;
  const cur = user?.region === 'INDIA' ? 'INR' : 'AED';

  const createMut = useMutation({
    mutationFn: (dto:any) => api.post('/loans', dto).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['my-loans']}); setShowForm(false); setForm({amount:'',months:'12',reason:''}); },
    onError: (e:any) => alert(e?.response?.data?.message || 'Request failed'),
  });

  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:8, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'var(--surface)', color:'var(--ink)' };

  return (
    <ESSLayout>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.01em', color:'var(--ink)' }}>My loans</h1>
          <p style={{ fontSize:13.5, color:'var(--ink-3)', marginTop:4 }}>Apply for a salary loan. Repaid as monthly EMIs deducted from payroll.</p>
        </div>
        {!showForm && <button onClick={()=>setShowForm(true)} style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Apply for loan</button>}
      </div>

      {/* Apply form */}
      {showForm && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:24, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:18 }}>New loan application</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Loan amount ({cur})</label>
              <input style={inp} type="number" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder={`Max ${maxAmount.toLocaleString()}`} />
              <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:4 }}>Maximum: {formatCurrency(maxAmount, cur)}</p>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Repayment period</label>
              <select style={inp} value={form.months} onChange={e=>s('months',e.target.value)}>
                {[3,6,9,12,18,24].filter(m=>m<=maxMonths).map(m=><option key={m} value={m}>{m} months</option>)}
              </select>
              {form.amount && <p style={{ fontSize:12, color:'var(--ink-3)', marginTop:4 }}>EMI: {formatCurrency(Math.ceil(+form.amount/+form.months), cur)}/month</p>}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Reason</label>
            <textarea style={{ ...inp, minHeight:72, resize:'vertical' } as any} value={form.reason} onChange={e=>s('reason',e.target.value)} placeholder="Brief reason for the loan request" />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>createMut.mutate({ amount:+form.amount, installments:+form.months, reason:form.reason })} disabled={!form.amount||createMut.isPending}
              style={{ padding:'9px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:createMut.isPending?.6:1 }}>
              {createMut.isPending ? 'Submitting…' : 'Submit application'}
            </button>
            <button onClick={()=>setShowForm(false)} style={{ padding:'9px 20px', background:'var(--bg)', color:'var(--ink-2)', border:'1px solid var(--line)', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Loans list */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}><div className="table-scroll">
        {isLoading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'var(--ink-3)' }}>Loading…</div>
        ) : (loans as any[]).length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No loan applications</div>
            <div style={{ fontSize:13.5, color:'var(--ink-3)' }}>Click "Apply for loan" to submit a request</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:'1px solid var(--line)' }}>
              {['Amount','Monthly EMI','Months','Reason','Status','Applied'].map((h,i)=>(
                <th key={h} style={{ padding:'10px 16px', textAlign:i>=4?'center':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(loans as any[]).map((l:any)=>(
                <tr key={l.id} style={{ borderBottom:'1px solid var(--line)' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={{ padding:'13px 16px', fontWeight:600, color:'var(--ink)' }}>{formatCurrency(l.amount, cur)}</td>
                  <td style={{ padding:'13px 16px', color:'var(--ink-2)' }}>{formatCurrency(Math.ceil(l.amount/l.installments), cur)}</td>
                  <td style={{ padding:'13px 16px', color:'var(--ink-2)' }}>{l.installments} months</td>
                  <td style={{ padding:'13px 16px', color:'var(--ink-3)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.reason||'—'}</td>
                  <td style={{ padding:'13px 16px', textAlign:'center' }}>
                    <span style={{ ...STATUS[l.status]||STATUS.PENDING, fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:999 }}>{l.status}</span>
                  </td>
                  <td style={{ padding:'13px 16px', color:'var(--ink-3)', fontSize:12.5 }}>{new Date(l.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </ESSLayout>
  );
}

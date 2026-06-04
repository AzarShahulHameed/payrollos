'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';
import { useAuthStore, useRegionStore } from '@/store/auth.store';

export default function ESSLeaves() {
  const { user } = useAuthStore();
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');

  const { data: leaves = [] } = useQuery({ queryKey: ['my-leaves'], queryFn: () => api.get('/leaves?myLeaves=true').then(r => r.data) });
  const { data: balances = [] } = useQuery({ queryKey: ['my-balances'], queryFn: () => user ? api.get(`/leaves/${user.id}/balances?year=${new Date().getFullYear()}`).then(r => r.data) : [] });

  const createMut = useMutation({
    mutationFn: (dto: any) => api.post('/leaves', dto).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-leaves'] }); setShowModal(false); setError(''); },
    onError: (e: any) => setError(e?.response?.data?.message || 'Failed to submit leave request'),
  });

  const types = region === 'UAE' ? ['ANNUAL','SICK','MATERNITY','PATERNITY','UNPAID'] : ['ANNUAL','SICK','CASUAL','MATERNITY','PATERNITY','UNPAID'];
  const days = form.startDate && form.endDate ? Math.max(0, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1) : 0;
  const s = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: '#fff' } as const;

  const ST: Record<string,{bg:string;c:string}> = { PENDING:{bg:'#fdf3e0',c:'#c77700'}, APPROVED:{bg:'#e7f6ea',c:'#28a745'}, REJECTED:{bg:'#fdecea',c:'#d83933'} };

  return (
    <ESSLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>My leaves</h1>
          <p style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>Apply and track your leave requests</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: '9px 18px', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Apply leave</button>
      </div>

      {/* Leave balances */}
      {(balances as any[]).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
          {(balances as any[]).map((b: any) => (
            <div key={b.id} style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{b.leaveType}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: b.remaining > 0 ? '#28a745' : '#d83933' }}>{b.remaining}</div>
              <div style={{ fontSize: 11.5, color: '#a1a1a6', marginTop: 4 }}>{b.used} used of {b.total}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ borderBottom: '1px solid #e3e3e6', background: '#fafafa' }}>
            {['Type','From','To','Days','Reason','Status'].map(h => <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(leaves as any[]).length === 0 ? <tr><td colSpan={6} style={{ padding: '52px 24px', textAlign: 'center', color: '#a1a1a6' }}>No leave requests yet</td></tr>
            : (leaves as any[]).map((l: any) => {
              const st = ST[l.status] || ST.PENDING;
              return (
                <tr key={l.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                  <td style={{ padding: '13px 20px', fontWeight: 600 }}>{l.leaveType?.replace('_',' ')}</td>
                  <td style={{ padding: '13px 20px', color: '#6e6e73' }}>{new Date(l.startDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{ padding: '13px 20px', color: '#6e6e73' }}>{new Date(l.endDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{ padding: '13px 20px' }}>{l.days}</td>
                  <td style={{ padding: '13px 20px', color: '#6e6e73', maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason || '—'}</div></td>
                  <td style={{ padding: '13px 20px' }}><span style={{ background: st.bg, color: st.c, fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>{l.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 18, width: 440, boxShadow: '0 18px 50px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #e3e3e6' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Apply for leave</div>
              <button onClick={() => setShowModal(false)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.07)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>Leave type</label>
                <select style={inp} value={form.leaveType} onChange={e => s('leaveType', e.target.value)}>
                  {types.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div><label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>From</label><input style={inp} type="date" value={form.startDate} onChange={e => s('startDate', e.target.value)} /></div>
                <div><label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>To</label><input style={inp} type="date" value={form.endDate} onChange={e => s('endDate', e.target.value)} /></div>
              </div>
              {days > 0 && <div style={{ background: '#e8f1fe', borderRadius: 9, padding: '8px 14px', fontSize: 13, color: '#0a84ff', fontWeight: 600, marginBottom: 14 }}>{days} day{days !== 1 ? 's' : ''} requested</div>}
              <div><label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>Reason</label><textarea style={{ ...inp, minHeight: 72, resize: 'vertical' } as any} value={form.reason} onChange={e => s('reason', e.target.value)} /></div>
              {error && <div style={{ marginTop: 12, padding: '10px 14px', background: '#fdecea', borderRadius: 9, fontSize: 13, color: '#d83933' }}>⚠️ {error}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid #e3e3e6', background: '#fafafa', borderRadius: '0 0 18px 18px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d2d2d6', borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => createMut.mutate({ leaveType: form.leaveType, startDate: form.startDate, endDate: form.endDate, reason: form.reason || undefined })} disabled={createMut.isPending || !form.startDate || !form.endDate}
                style={{ padding: '8px 20px', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (!form.startDate || !form.endDate) ? .5 : 1 }}>
                {createMut.isPending ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ESSLayout>
  );
}

'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { leavesApi, employeesApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
 
const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  PENDING:  { bg:'#fdf3e0', color:'#c77700' },
  APPROVED: { bg:'#e7f6ea', color:'#28a745' },
  REJECTED: { bg:'#fdecea', color:'#d83933' },
  CANCELLED:{ bg:'#f2f2f7', color:'#6e6e73' },
};
 
export default function LeavesPage() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
 
  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves', filter],
    queryFn: () => leavesApi.getAll({ status: filter === 'ALL' ? undefined : filter }),
  });
 
  const approveMut = useMutation({ mutationFn: (id: string) => leavesApi.approve(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }) });
  const rejectMut  = useMutation({ mutationFn: ({ id, reason }: any) => leavesApi.reject(id, reason), onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }) });
  const createMut  = useMutation({
    mutationFn: (dto: any) => leavesApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setShowModal(false); },
    onError: () => {},
  });
 
  const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];
  const counts: Record<string, number> = {
    ALL: (leaves as any[]).length,
    PENDING:  (leaves as any[]).filter((l: any) => l.status === 'PENDING').length,
    APPROVED: (leaves as any[]).filter((l: any) => l.status === 'APPROVED').length,
    REJECTED: (leaves as any[]).filter((l: any) => l.status === 'REJECTED').length,
  };
 
  return (
    <AppLayout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>Leave management</h1>
          <p style={{ fontSize:14, color:'#6e6e73', marginTop:4 }}>Employee leave requests · {region}</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Link href="/leaves/calendar" style={{ textDecoration:'none', padding:'9px 16px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontWeight:600, color:'#1d1d1f', cursor:'pointer', display:'inline-block' }}>
            Calendar view
          </Link>
          <button onClick={() => setShowModal(true)} style={{ padding:'9px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            + New request
          </button>
        </div>
      </div>
 
      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'7px 16px', border:`1px solid ${filter===f?'#0a84ff':'#d2d2d6'}`, borderRadius:9, fontSize:13.5, fontWeight:500, fontFamily:'inherit', background:filter===f?'#0a84ff':'#fff', color:filter===f?'#fff':'#6e6e73', cursor:'pointer', transition:'all .12s', display:'flex', alignItems:'center', gap:7 }}>
            {f.charAt(0)+f.slice(1).toLowerCase()}
            {counts[f] > 0 && <span style={{ background:filter===f?'rgba(255,255,255,.3)':'#e8e8ed', color:filter===f?'#fff':'#6e6e73', fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:999 }}>{counts[f]}</span>}
          </button>
        ))}
      </div>
 
      <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #e3e3e6', background:'#fafafa' }}>
              {['Employee','Leave type','From','To','Days','Status','Actions'].map(h => (
                <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#a1a1a6' }}>Loading…</td></tr>
            ) : (leaves as any[]).length === 0 ? (
              <tr><td colSpan={7}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>📅</div>
                  <div style={{ fontSize:15, fontWeight:600 }}>No leave requests found</div>
                  <div style={{ fontSize:13.5, color:'#a1a1a6', marginTop:5 }}>Submit a new leave request to get started</div>
                </div>
              </td></tr>
            ) : (leaves as any[]).map((l: any) => {
              const st = STATUS_STYLE[l.status] || STATUS_STYLE.CANCELLED;
              return (
                <tr key={l.id} style={{ borderBottom:'1px solid rgba(0,0,0,.04)', transition:'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background='#f7f9fc')}
                  onMouseLeave={e => (e.currentTarget.style.background='')}>
                  <td style={{ padding:'12px 18px' }}>
                    <div style={{ fontWeight:600 }}>{l.employee?.firstName} {l.employee?.lastName}</div>
                    <div style={{ fontSize:11.5, color:'#a1a1a6', marginTop:1 }}>{l.employee?.employeeCode}</div>
                  </td>
                  <td style={{ padding:'12px 18px', color:'#6e6e73' }}>{l.leaveType?.replace('_', ' ')}</td>
                  <td style={{ padding:'12px 18px', color:'#6e6e73' }}>{new Date(l.startDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{ padding:'12px 18px', color:'#6e6e73' }}>{new Date(l.endDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{ padding:'12px 18px', fontWeight:600 }}>{l.days}</td>
                  <td style={{ padding:'12px 18px' }}><span style={{ ...st, fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:999 }}>{l.status}</span></td>
                  <td style={{ padding:'12px 18px' }}>
                    {l.status === 'PENDING' && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => approveMut.mutate(l.id)} style={{ padding:'5px 12px', background:'#e7f6ea', color:'#28a745', border:'none', borderRadius:7, fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Approve</button>
                        <button onClick={() => rejectMut.mutate({ id:l.id, reason:'Declined' })} style={{ padding:'5px 12px', background:'#fdecea', color:'#d83933', border:'none', borderRadius:7, fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
 
      {showModal && (
        <LeaveModal
          region={region}
          onClose={() => setShowModal(false)}
          onSave={(dto: any) => createMut.mutate(dto)}
          saving={createMut.isPending}
          error={(createMut as any).error?.response?.data?.message}
        />
      )}
    </AppLayout>
  );
}
 
function LeaveModal({ region, onClose, onSave, saving, error }: any) {
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const s = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
 
  const { data: empData } = useQuery({
    queryKey: ['emp-search', empSearch, region],
    queryFn: () => employeesApi.getAll({ region, search: empSearch, limit: 10 }),
    enabled: empSearch.length >= 1,
  });
  const employees = (empData as any)?.data || [];
 
  const leaveTypes = region === 'UAE'
    ? ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY']
    : ['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY'];
 
  const days = form.startDate && form.endDate
    ? Math.max(0, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
    : 0;
 
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;
 
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:18, width:460, boxShadow:'0 18px 50px rgba(0,0,0,.18)', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #e3e3e6' }}>
          <div style={{ fontSize:17, fontWeight:700 }}>New leave request</div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:22 }}>
 
          {/* Employee dropdown */}
          <div style={{ marginBottom:14, position:'relative' }}>
            <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Employee</label>
            {selectedEmp ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', border:'1px solid #0a84ff', borderRadius:9, background:'#e8f1fe' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:700 }}>
                    {selectedEmp.firstName?.[0]}{selectedEmp.lastName?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'#1d1d1f' }}>{selectedEmp.firstName} {selectedEmp.lastName}</div>
                    <div style={{ fontSize:11.5, color:'#6e6e73' }}>{selectedEmp.employeeCode} · {selectedEmp.designation}</div>
                  </div>
                </div>
                <button onClick={() => { setSelectedEmp(null); setEmpSearch(''); }} style={{ background:'none', border:'none', color:'#6e6e73', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
              </div>
            ) : (
              <div style={{ position:'relative' }}>
                <input
                  style={inp}
                  placeholder="Search employee by name…"
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  autoComplete="off"
                />
                {showDropdown && employees.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e3e3e6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, maxHeight:220, overflowY:'auto', marginTop:4 }}>
                    {employees.map((emp: any) => (
                      <div key={emp.id} onClick={() => { setSelectedEmp(emp); setEmpSearch(''); setShowDropdown(false); }}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f5f5f7', transition:'background .1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background='#f7f9fc')}
                        onMouseLeave={e => (e.currentTarget.style.background='')}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize:13.5, fontWeight:600 }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize:11.5, color:'#a1a1a6' }}>{emp.employeeCode} · {emp.designation} · {emp.department?.name || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showDropdown && empSearch.length >= 1 && employees.length === 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e3e3e6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, padding:'16px', textAlign:'center', color:'#a1a1a6', fontSize:13, marginTop:4 }}>
                    No employees found
                  </div>
                )}
              </div>
            )}
          </div>
 
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Leave type</label>
            <select style={inp} value={form.leaveType} onChange={e => s('leaveType', e.target.value)}>
              {leaveTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
 
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>From</label><input style={inp} type="date" value={form.startDate} onChange={e => s('startDate', e.target.value)} /></div>
            <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>To</label><input style={inp} type="date" value={form.endDate} onChange={e => s('endDate', e.target.value)} /></div>
          </div>
 
          {days > 0 && (
            <div style={{ background:'#e8f1fe', borderRadius:9, padding:'9px 14px', fontSize:13, color:'#0a84ff', fontWeight:600, marginBottom:14 }}>
              {days} day{days !== 1 ? 's' : ''} requested
            </div>
          )}
 
          <div>
            <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Reason</label>
            <textarea style={{ ...inp, minHeight:72, resize:'vertical' } as any} value={form.reason} onChange={e => s('reason', e.target.value)} placeholder="Reason for leave…" />
          </div>
        </div>
 
        {error && (
          <div style={{ margin:'0 22px', padding:'10px 14px', background:'#fdecea', border:'1px solid #fcc', borderRadius:9, fontSize:13, color:'#d83933' }}>
            ⚠️ {error}
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'16px 22px', borderTop:'1px solid #e3e3e6', background:'#fafafa', borderRadius:'0 0 18px 18px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={() => onSave({ employeeId: selectedEmp?.id, ...form })} disabled={saving || !selectedEmp || !form.startDate || !form.endDate}
            style={{ padding:'8px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:(!selectedEmp || !form.startDate || !form.endDate) ? .5 : 1 }}>
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  );
}
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';

const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  PRESENT:  {bg:'#e7f6ea',color:'#28a745'},
  ABSENT:   {bg:'#fdecea',color:'#d83933'},
  HALF_DAY: {bg:'#fdf3e0',color:'#c77700'},
  HOLIDAY:  {bg:'#f2f2f7',color:'#6e6e73'},
  ON_LEAVE: {bg:'#e8f1fe',color:'#0a84ff'},
  LATE:     {bg:'#fdf3e0',color:'#c77700'},
};

export default function ESSAttendance() {
  const qc = useQueryClient();
  const now = new Date();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const { data: monthData } = useQuery({
    queryKey: ['my-attendance', now.getFullYear(), now.getMonth()+1],
    queryFn: () => api.get(`/attendance/my?year=${now.getFullYear()}&month=${now.getMonth()+1}`).then(r => r.data),
    refetchInterval: 30000,
  });

  const records: any[] = (monthData as any)?.records || [];
  const summary: any   = (monthData as any)?.summary  || {};

  const today = now.toISOString().split('T')[0];
  const todayRecord = records.find((r:any) => r.date?.startsWith(today));
  const isClockedIn  = !!todayRecord?.checkIn && !todayRecord?.checkOut;
  const isClockedOut = !!todayRecord?.checkIn &&  !!todayRecord?.checkOut;

  const fmt = (iso?: string) => iso
    ? new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
    : '—';

  const clockInMut = useMutation({
    mutationFn: () => api.post('/attendance/clock-in').then(r=>r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-attendance'] }),
    onError: (e:any) => alert(e?.response?.data?.message || 'Clock in failed — ensure your account is linked to an employee record'),
  });

  const clockOutMut = useMutation({
    mutationFn: () => api.post('/attendance/clock-out').then(r=>r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-attendance'] }),
    onError: (e:any) => alert(e?.response?.data?.message || 'Clock out failed'),
  });

  return (
    <ESSLayout>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.01em', color:'var(--ink)' }}>Attendance</h1>
        <p style={{ fontSize:13.5, color:'var(--ink-3)', marginTop:4 }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
      </div>

      {/* Clock in/out card */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:28, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Today</div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--ink)' }}>
            {now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
          {todayRecord?.checkIn && (
            <div style={{ fontSize:13.5, color:'var(--ink-3)', marginTop:10, display:'flex', gap:20 }}>
              <span>Clock in: <strong style={{ color:'var(--ink)' }}>{fmt(todayRecord.checkIn)}</strong></span>
              {todayRecord.checkOut && <span>Clock out: <strong style={{ color:'var(--ink)' }}>{fmt(todayRecord.checkOut)}</strong></span>}
              {todayRecord.hoursWorked && <span>Hours: <strong style={{ color:'#28a745' }}>{todayRecord.hoursWorked.toFixed(1)}h</strong></span>}
            </div>
          )}
        </div>

        <div>
          {!todayRecord && (
            <button onClick={()=>clockInMut.mutate()} disabled={clockInMut.isPending}
              className='clock-btn' style={{ padding:'13px 32px', background:'#28a745', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 12px rgba(40,167,69,.25)', opacity:clockInMut.isPending?.6:1 }}>
              {clockInMut.isPending ? 'Clocking in…' : 'Clock in'}
            </button>
          )}
          {isClockedIn && (
            <button onClick={()=>clockOutMut.mutate()} disabled={clockOutMut.isPending}
              className='clock-btn' style={{ padding:'13px 32px', background:'#d83933', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 12px rgba(216,57,51,.25)', opacity:clockOutMut.isPending?.6:1 }}>
              {clockOutMut.isPending ? 'Clocking out…' : 'Clock out'}
            </button>
          )}
          {isClockedOut && (
            <div style={{ padding:'12px 24px', background:'#e7f6ea', color:'#28a745', borderRadius:10, fontSize:14, fontWeight:600 }}>
              Completed for today
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Present',   value:summary.present  ||0, color:'#28a745' },
          { label:'Absent',    value:summary.absent   ||0, color:'#d83933' },
          { label:'Half days', value:summary.halfDay  ||0, color:'#c77700' },
          { label:'Total hours',value:summary.totalHours?+(summary.totalHours).toFixed(1):0, color:'#0a84ff', suffix:'h' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 18px' }}>
            <div style={{ fontSize:26, fontWeight:700, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}{s.suffix||''}</div>
            <div style={{ fontSize:12.5, color:'var(--ink-3)', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly records */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', fontSize:14, fontWeight:600, color:'var(--ink)' }}>
          {MONTHS[now.getMonth()]} {now.getFullYear()} — attendance record
        </div>
        {records.length===0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--ink-3)' }}>No attendance records this month</div>
        ) : (
          <div className='table-scroll'><table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
            <thead><tr style={{ borderBottom:'1px solid var(--line)' }}>
              {['Date','Status','Clock in','Clock out','Hours'].map((h,i)=>(
                <th key={h} style={{ padding:'10px 16px', textAlign:i>=2?'center':'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {records.map((r:any)=>{
                const sc = STATUS_STYLE[r.status] || STATUS_STYLE.ABSENT;
                return (
                  <tr key={r.id||r.date} style={{ borderBottom:'1px solid var(--line)' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <td style={{ padding:'11px 16px', fontWeight:500, color:'var(--ink)' }}>
                      {new Date(r.date).toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'})}
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ ...sc, fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:999 }}>{r.status?.replace('_',' ')}</span>
                    </td>
                    <td style={{ padding:'11px 16px', textAlign:'center', color:'var(--ink-2)', fontSize:13 }}>{fmt(r.checkIn)}</td>
                    <td style={{ padding:'11px 16px', textAlign:'center', color:'var(--ink-2)', fontSize:13 }}>{fmt(r.checkOut)}</td>
                    <td style={{ padding:'11px 16px', textAlign:'center', color:'var(--ink-2)', fontSize:13 }}>
                      {r.hoursWorked ? `${(+r.hoursWorked).toFixed(1)}h` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </ESSLayout>
  );
}

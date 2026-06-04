'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { initials } from '@/lib/utils';

const STATUS_META: Record<string,{label:string;color:string;bg:string;icon:string}> = {
  PRESENT:  { label:'Present',  color:'#28a745', bg:'#e7f6ea', icon:'✓' },
  ABSENT:   { label:'Absent',   color:'#d83933', bg:'#fdecea', icon:'✗' },
  HALF_DAY: { label:'Half day', color:'#c77700', bg:'#fdf3e0', icon:'½' },
  LATE:     { label:'Late',     color:'#0a84ff', bg:'#e8f1fe', icon:'⏰' },
  ON_LEAVE: { label:'On leave', color:'#af52de', bg:'#f5eeff', icon:'🏖' },
  HOLIDAY:  { label:'Holiday',  color:'#6e6e73', bg:'#f2f2f7', icon:'🎉' },
  WEEKEND:  { label:'Weekend',  color:'#a1a1a6', bg:'#f5f5f7', icon:'—'  },
};
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const AV_COLORS = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f','#30b0c7'];


function parseBulkAttendanceCSV(text: string) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
    const row: Record<string,string> = {};
    headers.forEach((h,i) => row[h] = vals[i]||'');
    return {
      employeeCode: row['employeecode'] || row['employee_code'] || row['code'],
      date:         row['date'],
      status:       (row['status']||'PRESENT').toUpperCase(),
      checkIn:      row['checkin'] || row['check_in'] || row['clockin'],
      checkOut:     row['checkout'] || row['check_out'] || row['clockout'],
    };
  }).filter(r => r.date && r.employeeCode);
}

export default function AttendancePage() {
  const { region } = useRegionStore();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView]   = useState<'summary'|'grid'>('summary');
  const [markModal, setMarkModal] = useState<{empId:string;date:string;name:string}|null>(null);
  const [bulkModal, setBulkModal] = useState(false);

  const { data: summary = [], isLoading: sumLoad } = useQuery({
    queryKey: ['attendance-summary', year, month],
    queryFn: () => api.get(`/attendance/summary?year=${year}&month=${month}`).then(r => r.data),
    enabled: view === 'summary',
  });

  const { data: monthly = [], isLoading: monLoad } = useQuery({
    queryKey: ['attendance-monthly', year, month],
    queryFn: () => api.get(`/attendance/monthly?year=${year}&month=${month}`).then(r => r.data),
    enabled: view === 'grid',
  });

  const markMut = useMutation({
    mutationFn: (dto: any) => api.post('/attendance/mark', dto).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['attendance-summary'] }); qc.invalidateQueries({ queryKey:['attendance-monthly'] }); setMarkModal(null); },
  });

  // Build days array for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Group monthly records by employee
  const byEmployee = (monthly as any[]).reduce((acc: any, rec: any) => {
    const empId = rec.employee?.id;
    if (!empId) return acc;
    if (!acc[empId]) acc[empId] = { employee: rec.employee, days: {} };
    const d = new Date(rec.date).getDate();
    acc[empId].days[d] = rec.status;
    return acc;
  }, {});

  const avColor = (n?: string) => AV_COLORS[(n?.charCodeAt(0)||0) % AV_COLORS.length];

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>Attendance</h1>
          <p style={{ fontSize:14, color:'#6e6e73', marginTop:4 }}>Track employee attendance · {region}</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={month} onChange={e=>setMonth(+e.target.value)} style={{ height:34, padding:'0 28px 0 10px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, background:'#fff', fontFamily:'inherit', outline:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center', WebkitAppearance:'none' }}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(+e.target.value)} style={{ height:34, padding:'0 28px 0 10px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, background:'#fff', fontFamily:'inherit', outline:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center', WebkitAppearance:'none' }}>
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <div style={{ display:'flex', background:'#e8e8ed', borderRadius:9, padding:3, gap:3 }}>
            {['summary','grid'].map(v => (
              <button key={v} onClick={()=>setView(v as any)} style={{ padding:'5px 14px', border:'none', borderRadius:7, fontSize:12.5, fontWeight:500, background:view===v?'#fff':'transparent', color:view===v?'#1d1d1f':'#6e6e73', cursor:'pointer', fontFamily:'inherit', boxShadow:view===v?'0 1px 3px rgba(0,0,0,.1)':undefined, transition:'all .1s', textTransform:'capitalize' }}>{v}</button>
            ))}
          </div>
          <label style={{ padding:'8px 16px', background:'#fff', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', color:'var(--ink)', display:'inline-flex', alignItems:'center', gap:6 }}>
            Import CSV
            <input type="file" accept=".csv" style={{ display:'none' }} onChange={async e=>{
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const rows = parseBulkAttendanceCSV(text);
              if (!rows.length) { alert('No valid rows. Columns needed: employeeCode, date, status, checkIn, checkOut'); return; }
              try {
                const res = await api.post('/attendance/bulk', { records: rows });
                alert('Imported ' + ((res.data as any)?.imported || rows.length) + ' records');
                qc.invalidateQueries({ queryKey:['attendance-summary'] });
                qc.invalidateQueries({ queryKey:['attendance-monthly'] });
              } catch(er:any) { alert(er?.response?.data?.message||'Import failed'); }
              e.target.value = '';
            }} />
          </label>
          <button onClick={()=>setBulkModal(true)} style={{ padding:'8px 16px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            + Mark attendance
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        {Object.entries(STATUS_META).filter(([k]) => k !== 'WEEKEND').map(([k,v]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:v.bg, borderRadius:999, fontSize:12, fontWeight:500, color:v.color }}>
            <span>{v.icon}</span> {v.label}
          </div>
        ))}
      </div>

      {/* Summary view */}
      {view === 'summary' && (
        <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #e3e3e6', background:'#fafafa' }}>
                {['Employee','Present','Absent','Half day','Late','On leave','LOP days','Hours worked'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign: h==='Employee'?'left':'center', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sumLoad ? (
                <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#a1a1a6' }}>Loading…</td></tr>
              ) : (summary as any[]).length === 0 ? (
                <tr><td colSpan={8}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>📅</div>
                    <div style={{ fontSize:15, fontWeight:600 }}>No attendance data</div>
                    <div style={{ fontSize:13.5, color:'#a1a1a6', marginTop:5 }}>Start marking attendance to see the summary here</div>
                  </div>
                </td></tr>
              ) : (summary as any[]).map((row: any) => (
                <tr key={row.employee.id} style={{ borderBottom:'1px solid rgba(0,0,0,.04)', transition:'background .1s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')}
                  onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:avColor(row.employee.firstName), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
                        {initials(row.employee.firstName, row.employee.lastName)}
                      </div>
                      <div>
                        <div style={{ fontWeight:600 }}>{row.employee.firstName} {row.employee.lastName}</div>
                        <div style={{ fontSize:11.5, color:'#a1a1a6' }}>{row.employee.department?.name || row.employee.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign:'center', padding:'12px 16px' }}><span style={{ background:'#e7f6ea', color:'#28a745', padding:'3px 10px', borderRadius:999, fontSize:12, fontWeight:600 }}>{row.present}</span></td>
                  <td style={{ textAlign:'center', padding:'12px 16px' }}><span style={{ background: row.absent?'#fdecea':'#f5f5f7', color:row.absent?'#d83933':'#a1a1a6', padding:'3px 10px', borderRadius:999, fontSize:12, fontWeight:600 }}>{row.absent}</span></td>
                  <td style={{ textAlign:'center', padding:'12px 16px', color:row.halfDay?'#c77700':'#a1a1a6', fontWeight:600, fontSize:13 }}>{row.halfDay}</td>
                  <td style={{ textAlign:'center', padding:'12px 16px', color:row.late?'#0a84ff':'#a1a1a6', fontWeight:600, fontSize:13 }}>{row.late}</td>
                  <td style={{ textAlign:'center', padding:'12px 16px', color:'#a1a1a6', fontSize:13 }}>{row.onLeave}</td>
                  <td style={{ textAlign:'center', padding:'12px 16px' }}>
                    {row.lopDays > 0 ? <span style={{ background:'#fdecea', color:'#d83933', padding:'3px 10px', borderRadius:999, fontSize:12, fontWeight:600 }}>{row.lopDays}d</span> : <span style={{ color:'#a1a1a6' }}>—</span>}
                  </td>
                  <td style={{ textAlign:'center', padding:'12px 16px', color:'#6e6e73', fontVariantNumeric:'tabular-nums' }}>{row.totalHours.toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid view */}
      {view === 'grid' && (
        <div style={{ background:'#fff', border:'1px solid #e3e3e6', borderRadius:14, overflow:'auto', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <table style={{ borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#fafafa', borderBottom:'1px solid #e3e3e6' }}>
                <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.04em', position:'sticky', left:0, background:'#fafafa', minWidth:180, zIndex:1 }}>Employee</th>
                {days.map(d => {
                  const date = new Date(year, month-1, d);
                  const isWknd = date.getDay()===0 || date.getDay()===6;
                  const isToday = date.toDateString() === now.toDateString();
                  return (
                    <th key={d} style={{ padding:'8px 6px', textAlign:'center', fontSize:10.5, fontWeight:600, color: isToday?'#0a84ff':isWknd?'#d2d2d6':'#a1a1a6', minWidth:36, borderLeft:'1px solid #f5f5f7', background: isToday?'#e8f1fe':isWknd?'#fafafa':'transparent' }}>
                      <div>{d}</div>
                      <div style={{ fontSize:9, marginTop:2 }}>{['S','M','T','W','T','F','S'][date.getDay()]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {monLoad ? <tr><td colSpan={daysInMonth+1} style={{ padding:32, textAlign:'center', color:'#a1a1a6' }}>Loading…</td></tr>
              : Object.values(byEmployee).length===0 ? (
                <tr><td colSpan={daysInMonth+1}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>📅</div>
                    <div style={{ fontSize:15, fontWeight:600 }}>No attendance records</div>
                    <div style={{ fontSize:13.5, color:'#a1a1a6', marginTop:5 }}>Use "Mark attendance" to add records</div>
                  </div>
                </td></tr>
              ) : Object.values(byEmployee).map((row: any) => (
                <tr key={row.employee.id} style={{ borderBottom:'1px solid rgba(0,0,0,.04)' }}>
                  <td style={{ padding:'10px 16px', position:'sticky', left:0, background:'#fff', borderRight:'1px solid #e3e3e6', zIndex:1 }}>
                    <div style={{ fontWeight:600, fontSize:12.5 }}>{row.employee.firstName} {row.employee.lastName}</div>
                    <div style={{ fontSize:11, color:'#a1a1a6' }}>{row.employee.employeeCode}</div>
                  </td>
                  {days.map(d => {
                    const date = new Date(year, month-1, d);
                    const isWknd = date.getDay()===0 || date.getDay()===6;
                    const status = row.days[d] || (isWknd ? 'WEEKEND' : null);
                    const meta = status ? STATUS_META[status] : null;
                    return (
                      <td key={d} style={{ padding:'6px 4px', textAlign:'center', borderLeft:'1px solid #f5f5f7', background: isWknd?'#fafafa':undefined, cursor: isWknd?'default':'pointer' }}
                        onClick={() => !isWknd && setMarkModal({ empId:row.employee.id, date:`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`, name:`${row.employee.firstName} ${row.employee.lastName}` })}>
                        {meta ? (
                          <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:6, background:meta.bg, color:meta.color, fontSize:11, fontWeight:700 }}>{meta.icon}</span>
                        ) : (
                          <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:6, background:'transparent', color:'#d2d2d6', fontSize:16 }}>+</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mark single attendance modal */}
      {markModal && (
        <MarkModal
          empId={markModal.empId}
          date={markModal.date}
          name={markModal.name}
          onClose={() => setMarkModal(null)}
          onSave={(dto: any) => markMut.mutate({ ...dto, employeeId: markModal.empId, date: markModal.date })}
          saving={markMut.isPending}
        />
      )}

      {/* Bulk mark modal */}
      {bulkModal && (
        <BulkMarkModal
          year={year} month={month}
          employees={(summary as any[]).map((s: any) => s.employee)}
          onClose={() => setBulkModal(false)}
          onSave={(records: any[]) => api.post('/attendance/bulk', { records }).then(() => { qc.invalidateQueries({ queryKey:['attendance-summary'] }); qc.invalidateQueries({ queryKey:['attendance-monthly'] }); setBulkModal(false); })}
        />
      )}
    </AppLayout>
  );
}

function MarkModal({ empId, date, name, onClose, onSave, saving }: any) {
  const [status, setStatus] = useState('PRESENT');
  const [checkIn, setCheckIn] = useState('09:00');
  const [checkOut, setCheckOut] = useState('18:00');
  const [notes, setNotes] = useState('');
  const inp = { padding:'8px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff', width:'100%' } as const;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:420, boxShadow:'0 18px 50px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #e3e3e6' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>Mark attendance</div>
            <div style={{ fontSize:13, color:'#6e6e73', marginTop:2 }}>{name} · {date}</div>
          </div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:22 }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:8 }}>Status</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {Object.entries(STATUS_META).filter(([k]) => !['WEEKEND','HOLIDAY'].includes(k)).map(([k,v]) => (
                <button key={k} onClick={() => setStatus(k)} style={{ padding:'9px 8px', border:`2px solid ${status===k?v.color:'#e3e3e6'}`, borderRadius:9, background:status===k?v.bg:'#fff', color:status===k?v.color:'#6e6e73', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', gap:4, transition:'all .12s' }}>
                  <span style={{ fontSize:16 }}>{v.icon}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          {(status==='PRESENT'||status==='LATE') && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Check-in</label><input style={inp} type="time" value={checkIn} onChange={e=>setCheckIn(e.target.value)} /></div>
              <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Check-out</label><input style={inp} type="time" value={checkOut} onChange={e=>setCheckOut(e.target.value)} /></div>
            </div>
          )}
          <div><label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#6e6e73', marginBottom:6 }}>Notes (optional)</label><input style={inp} placeholder="Any notes…" value={notes} onChange={e=>setNotes(e.target.value)} /></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid #e3e3e6', background:'#fafafa', borderRadius:'0 0 16px 16px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={() => onSave({ status, checkIn:(status==='PRESENT'||status==='LATE')?checkIn:undefined, checkOut:(status==='PRESENT'||status==='LATE')?checkOut:undefined, notes })} disabled={saving} style={{ padding:'8px 18px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkMarkModal({ year, month, employees, onClose, onSave }: any) {
  const today = `${year}-${String(month).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
  const [date, setDate] = useState(today);
  const [statuses, setStatuses] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  const setAll = (status: string) => {
    const next: Record<string,string> = {};
    employees.forEach((e: any) => { next[e.id] = status; });
    setStatuses(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const records = employees
      .filter((e: any) => statuses[e.id])
      .map((e: any) => ({ employeeId: e.id, date, status: statuses[e.id] }));
    await onSave(records);
    setSaving(false);
  };

  const inp = { padding:'7px 12px', border:'1px solid #d2d2d6', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' } as const;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:600, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 18px 50px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #e3e3e6' }}>
          <div style={{ fontSize:17, fontWeight:700 }}>Mark attendance for all employees</div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.07)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid #e3e3e6', display:'flex', alignItems:'center', gap:12 }}>
          <div>
            <label style={{ fontSize:12.5, fontWeight:600, color:'#6e6e73', marginRight:8 }}>Date</label>
            <input style={{ ...inp, width:160 }} type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <span style={{ fontSize:12.5, color:'#6e6e73', alignSelf:'center' }}>Mark all:</span>
            {['PRESENT','ABSENT','HOLIDAY'].map(s => (
              <button key={s} onClick={() => setAll(s)} style={{ padding:'5px 12px', background: s==='PRESENT'?'#e7f6ea':s==='ABSENT'?'#fdecea':'#f2f2f7', color: s==='PRESENT'?'#28a745':s==='ABSENT'?'#d83933':'#6e6e73', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {s.charAt(0)+s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 22px' }}>
          {employees.map((emp: any) => (
            <div key={emp.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(0,0,0,.04)' }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
                {initials(emp.firstName, emp.lastName)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:500 }}>{emp.firstName} {emp.lastName}</div>
                <div style={{ fontSize:11.5, color:'#a1a1a6' }}>{emp.department?.name || emp.employeeCode}</div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                {Object.entries(STATUS_META).filter(([k])=>!['WEEKEND'].includes(k)).map(([k,v]) => (
                  <button key={k} onClick={() => setStatuses(p=>({...p,[emp.id]:k}))} title={v.label}
                    style={{ width:30, height:30, border:`2px solid ${statuses[emp.id]===k?v.color:'transparent'}`, borderRadius:7, background:statuses[emp.id]===k?v.bg:'#f5f5f7', color:statuses[emp.id]===k?v.color:'#a1a1a6', fontSize:12, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .1s' }}>
                    {v.icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 22px', borderTop:'1px solid #e3e3e6', background:'#fafafa', borderRadius:'0 0 16px 16px' }}>
          <div style={{ fontSize:13, color:'#6e6e73', alignSelf:'center' }}>{Object.keys(statuses).length} of {employees.length} marked</div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:'1px solid #d2d2d6', borderRadius:8, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || Object.keys(statuses).length===0} style={{ padding:'8px 20px', background:'#0a84ff', color:'#fff', border:'none', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: Object.keys(statuses).length===0?.5:1 }}>
              {saving ? 'Saving…' : `Save ${Object.keys(statuses).length} records`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRegionStore } from '@/store/auth.store';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const LEAVE_COLORS = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f','#30b0c7','#d83933'];
const AV = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f'];
const avColor = (n='') => AV[(n?.charCodeAt(0)||0) % AV.length];

export default function LeaveCalendar() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const { region } = useRegionStore();

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves-calendar', year, month],
    queryFn: () => api.get('/leaves', { params: { status:'APPROVED', year, month: month+1, limit:200 } }).then(r=>r.data).catch(()=>[]),
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const leavesByDate: Record<string, any[]> = {};
  (leaves as any[]).forEach((l:any, idx:number) => {
    const start = new Date(l.startDate);
    const end   = new Date(l.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      if (d.getFullYear()===year && d.getMonth()===month) {
        const key = d.getDate().toString();
        if (!leavesByDate[key]) leavesByDate[key] = [];
        leavesByDate[key].push({ ...l, colorIdx: idx % LEAVE_COLORS.length });
      }
    }
  });

  const prev = () => { if (month===0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); };
  const next = () => { if (month===11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); };
  const isCurrentMonth = now.getFullYear()===year && now.getMonth()===month;

  return (
    <AppLayout>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em', color:'var(--ink)' }}>Leave calendar</h1>
          <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Approved leave this month</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link href="/leaves" style={{ textDecoration:'none', padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:8, fontSize:13.5, color:'var(--ink)', fontWeight:500 }}>List view</Link>
          <button onClick={()=>{ setMonth(now.getMonth()); setYear(now.getFullYear()); }}
            style={{ padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:8, fontSize:13.5, color:'var(--ink)', fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            Today
          </button>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <button onClick={prev} style={{ width:34, height:34, borderRadius:8, border:'1px solid var(--line)', background:'var(--surface)', cursor:'pointer', fontSize:18, color:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>&#8249;</button>
        <div style={{ fontSize:20, fontWeight:700, color:'var(--ink)' }}>{MONTHS_LONG[month]} {year}</div>
        <button onClick={next} style={{ width:34, height:34, borderRadius:8, border:'1px solid var(--line)', background:'var(--surface)', cursor:'pointer', fontSize:18, color:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>&#8250;</button>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--line)' }}>
          {DAYS.map(d=>(
            <div key={d} style={{ padding:'10px 0', textAlign:'center', fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{d}</div>
          ))}
        </div>

        {Array.from({length:cells.length/7},(_,wi)=>(
          <div key={wi} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--line)' }}>
            {cells.slice(wi*7,(wi+1)*7).map((day,di)=>{
              const dayLeaves = day ? (leavesByDate[day.toString()]||[]) : [];
              const isToday = isCurrentMonth && day===now.getDate();
              return (
                <div key={di} style={{ minHeight:90, padding:'6px 8px', borderRight:di<6?'1px solid var(--line)':'none', background:day?'var(--surface)':'var(--bg)' }}>
                  {day && (
                    <>
                      <div style={{ width:26, height:26, borderRadius:'50%', background:isToday?'#0a84ff':'transparent', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:isToday?700:400, color:isToday?'#fff':'var(--ink)' }}>{day}</span>
                      </div>
                      {dayLeaves.slice(0,3).map((l:any,i:number)=>(
                        <div key={i} style={{ background:LEAVE_COLORS[l.colorIdx]+'22', borderLeft:`3px solid ${LEAVE_COLORS[l.colorIdx]}`, borderRadius:4, padding:'2px 6px', marginBottom:2 }}>
                          <span style={{ fontSize:11, fontWeight:600, color:LEAVE_COLORS[l.colorIdx], overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>
                            {l.employee?.firstName} {l.employee?.lastName?.[0]}.
                          </span>
                          <span style={{ fontSize:10, color:LEAVE_COLORS[l.colorIdx], opacity:.8 }}>{l.leaveType?.replace(/_/g,' ')}</span>
                        </div>
                      ))}
                      {dayLeaves.length>3 && <div style={{ fontSize:10.5, color:'var(--ink-3)' }}>+{dayLeaves.length-3} more</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {(leaves as any[]).length > 0 && (
        <div style={{ marginTop:20, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:12 }}>On leave this month</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {Array.from(new Set((leaves as any[]).map((l:any)=>l.employeeId))).map((empId:any)=>{
              const l = (leaves as any[]).find((x:any)=>x.employeeId===empId);
              return (
                <div key={empId} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg)', border:'1px solid var(--line)', borderRadius:8, padding:'6px 12px' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:avColor(l?.employee?.firstName), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {l?.employee?.firstName?.[0]}{l?.employee?.lastName?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--ink)' }}>{l?.employee?.firstName} {l?.employee?.lastName}</div>
                    <div style={{ fontSize:11, color:'var(--ink-3)' }}>{l?.leaveType?.replace(/_/g,' ')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

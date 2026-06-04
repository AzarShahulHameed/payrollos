'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';

const AV_COLORS = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f','#30b0c7','#d83933','#5856d6'];
const avColor = (n='') => AV_COLORS[(n?.charCodeAt(0)||0) % AV_COLORS.length];

function EmployeeCard({ emp, compact=false }: { emp:any; compact?:boolean }) {
  const color = avColor(emp.firstName);
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--line)', borderRadius:compact?10:14,
      padding:compact?'10px 14px':'16px 18px', minWidth:compact?140:180, maxWidth:compact?160:200,
      boxShadow:'var(--sh-sm)', textAlign:'center', position:'relative',
    }}>
      {/* Avatar */}
      <div style={{ width:compact?40:56, height:compact?40:56, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:compact?14:18, fontWeight:700, margin:'0 auto', marginBottom:8, overflow:'hidden', border:'2px solid var(--line)' }}>
        {emp.photoUrl
          ? <img src={emp.photoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : `${emp.firstName?.[0]||''}${emp.lastName?.[0]||''}`
        }
      </div>
      <div style={{ fontSize:compact?12.5:13.5, fontWeight:700, color:'var(--ink)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {emp.firstName} {emp.lastName}
      </div>
      <div style={{ fontSize:compact?11:12, color:'var(--ink-3)', marginBottom:compact?0:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {emp.designation}
      </div>
      {!compact && emp.department?.name && (
        <span style={{ fontSize:10.5, fontWeight:600, color:avColor(emp.department.name), background:avColor(emp.department.name)+'18', padding:'2px 8px', borderRadius:999 }}>
          {emp.department.name}
        </span>
      )}
    </div>
  );
}

function DeptGroup({ dept, employees }: { dept: any; employees: any[] }) {
  const [expanded, setExpanded] = useState(true);
  const color = avColor(dept.name);

  return (
    <div style={{ marginBottom:24 }}>
      {/* Department header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, cursor:'pointer' }}
        onClick={()=>setExpanded(v=>!v)}>
        <div style={{ width:36, height:36, borderRadius:10, background:color+'22', border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <div style={{ width:12, height:12, borderRadius:3, background:color }} />
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>{dept.name}</div>
          <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>{employees.length} employee{employees.length!==1?'s':''}</div>
        </div>
        <span style={{ marginLeft:'auto', color:'var(--ink-3)', fontSize:18 }}>{expanded?'▾':'▸'}</span>
      </div>

      {expanded && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, paddingLeft:46 }}>
          {employees.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  const { region } = useRegionStore();
  const [view, setView] = useState<'dept'|'all'>('dept');
  const [search, setSearch] = useState('');

  const { data: empsData, isLoading } = useQuery({
    queryKey: ['employees-org', region],
    queryFn: () => api.get('/employees', { params: { region, limit: 200 } }).then(r => r.data),
  });

  const employees: any[] = (empsData as any)?.employees || (empsData as any)?.data || (Array.isArray(empsData) ? empsData : []);
  const active = employees.filter(e => e.status === 'ACTIVE');

  const filtered = search
    ? active.filter(e =>
        `${e.firstName} ${e.lastName} ${e.designation} ${e.department?.name}`.toLowerCase().includes(search.toLowerCase())
      )
    : active;

  // Group by department
  const byDept = filtered.reduce((acc: Record<string,any[]>, emp: any) => {
    const deptName = emp.department?.name || 'No department';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(emp);
    return acc;
  }, {});

  // Stats
  const deptCount = Object.keys(byDept).length;

  return (
    <AppLayout>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em', color:'var(--ink)' }}>Organisation</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>{active.length} active employees · {deptCount} departments · {region}</p>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:24, flexWrap:'wrap' }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name, designation, department…"
          style={{ flex:1, minWidth:200, maxWidth:360, padding:'9px 14px', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'var(--surface)', color:'var(--ink)' }}
        />
        <div style={{ display:'flex', gap:6 }}>
          {(['dept','all'] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--line)', fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit', background:view===v?'#0a84ff':'var(--surface)', color:view===v?'#fff':'var(--ink)' }}>
              {v==='dept'?'By department':'All employees'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {Object.entries(byDept).map(([deptName, emps])=>(
          <div key={deptName} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:'14px 16px', cursor:'pointer' }}
            onClick={()=>{ setView('dept'); setSearch(''); }}>
            <div style={{ fontSize:22, fontWeight:800, color:avColor(deptName), marginBottom:4, fontVariantNumeric:'tabular-nums' }}>{(emps as any[]).length}</div>
            <div style={{ fontSize:13, color:'var(--ink)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deptName}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--ink-3)' }}>Loading…</div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--ink-3)' }}>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No employees found</div>
          <div style={{ fontSize:13.5 }}>Try a different search term</div>
        </div>
      ) : view==='dept' ? (
        // Department grouped view
        Object.entries(byDept).map(([deptName, emps])=>(
          <DeptGroup key={deptName} dept={{ name:deptName }} employees={emps as any[]} />
        ))
      ) : (
        // All employees grid
        <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
          {filtered.map(emp=><EmployeeCard key={emp.id} emp={emp} />)}
        </div>
      )}
    </AppLayout>
  );
}

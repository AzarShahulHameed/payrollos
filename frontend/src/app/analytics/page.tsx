'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import { analyticsApi, employeesApi, api } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency, initials } from '@/lib/utils';

const COLORS = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f','#30b0c7'];

const sel: React.CSSProperties = {
  height:34, padding:'0 28px 0 10px', border:'1px solid var(--line-2)',
  borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none',
  background:'var(--surface)', color:'var(--ink)', cursor:'pointer',
  backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center',
  WebkitAppearance:'none' as any, appearance:'none' as any,
};

export default function AnalyticsPage() {
  const { region } = useRegionStore();
  const cur = region === 'UAE' ? 'AED' : 'INR';

  // ── Filters ────────────────────────────────────────────────
  const [filterEmpId,   setFilterEmpId]   = useState('');
  const [filterDeptId,  setFilterDeptId]  = useState('');
  const [filterDesig,   setFilterDesig]   = useState('');
  const [filterYear,    setFilterYear]    = useState(new Date().getFullYear());
  const [decompOpen,    setDecompOpen]    = useState(false);
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());

  // ── Data ───────────────────────────────────────────────────
  const { data: kpi } = useQuery({ queryKey:['kpi',region], queryFn:()=>analyticsApi.getKpi(region), staleTime:0, retry:2 });
  const { data: trend=[] } = useQuery({ queryKey:['trend',region], queryFn:()=>analyticsApi.getTrend(region), staleTime:0, retry:2 });
  const { data: byDept=[] } = useQuery({ queryKey:['dept',region], queryFn:()=>analyticsApi.getByDepartment(region), staleTime:0, retry:2 });
  const { data: decomp } = useQuery({ queryKey:['decomp',region], queryFn:()=>analyticsApi.getDecomposition({ region }) });
  const { data: empData } = useQuery({ queryKey:['employees',region], queryFn:()=>employeesApi.getAll({ region, limit:200 }) });
  const { data: deptData=[] } = useQuery({ queryKey:['departments'], queryFn:()=>api.get('/settings/departments').then(r=>r.data) });

  const allEmps  = (empData as any)?.data || [];
  const allDepts = deptData as any[];
  // Unique designations from employees
  const designations = [...new Set(allEmps.map((e:any)=>e.designation).filter(Boolean))].sort();

  const hasFilter = filterEmpId || filterDeptId || filterDesig;

  // Filter trend/dept data if employee filter is active
  const trendData = trend as any[];
  const deptData2 = (byDept as any[]).filter((d:any)=>!filterDeptId || d.id===filterDeptId);

  // KPI filtered by employee
  const filteredEmp = filterEmpId ? allEmps.find((e:any)=>e.id===filterEmpId) : null;

  const clearFilters = () => { setFilterEmpId(''); setFilterDeptId(''); setFilterDesig(''); };
  const toggle = (id:string) => setExpanded(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <AppLayout>
      {/* ── Header + Filters ──────────────────────────────── */}
      <div style={{ marginBottom:22 }}>
        {/* Title row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em', color:'var(--ink)' }}>Analytics</h1>
            <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Payroll insights · {region === 'UAE' ? 'UAE' : 'India'}</p>
          </div>
          {hasFilter && (
            <button onClick={clearFilters} style={{ height:34, padding:'0 14px', background:'#fdecea', color:'#d83933', border:'1px solid #fcc', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              × Clear all
            </button>
          )}
        </div>
        {/* Filter bar — horizontal row, full width */}
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:12.5, fontWeight:600, color:'var(--ink-3)', whiteSpace:'nowrap' }}>Filter by</span>
          <select value={filterEmpId} onChange={e=>setFilterEmpId(e.target.value)} style={{ ...sel, flex:1 }}>
            <option value="">All employees</option>
            {allEmps.map((e:any)=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
          </select>
          <select value={filterDeptId} onChange={e=>setFilterDeptId(e.target.value)} style={{ ...sel, flex:1 }}>
            <option value="">All departments</option>
            {allDepts.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterDesig} onChange={e=>setFilterDesig(e.target.value)} style={{ ...sel, flex:1 }}>
            <option value="">All designations</option>
            {designations.map((d:any)=><option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterYear} onChange={e=>setFilterYear(+e.target.value)} style={{ ...sel, width:90 }}>
            {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Active filter badges */}
        {hasFilter && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
            {filterEmpId && <span style={{ background:'#e8f1fe', color:'#0a84ff', fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:999, display:'flex', alignItems:'center', gap:6 }}>
              👤 {allEmps.find((e:any)=>e.id===filterEmpId)?.firstName} {allEmps.find((e:any)=>e.id===filterEmpId)?.lastName}
              <button onClick={()=>setFilterEmpId('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#0a84ff', fontSize:14, padding:0, lineHeight:1 }}>×</button>
            </span>}
            {filterDeptId && <span style={{ background:'#e7f6ea', color:'#28a745', fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:999, display:'flex', alignItems:'center', gap:6 }}>
              🏢 {allDepts.find((d:any)=>d.id===filterDeptId)?.name}
              <button onClick={()=>setFilterDeptId('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#28a745', fontSize:14, padding:0, lineHeight:1 }}>×</button>
            </span>}
            {filterDesig && <span style={{ background:'#fdf3e0', color:'#c77700', fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:999, display:'flex', alignItems:'center', gap:6 }}>
              💼 {filterDesig}
              <button onClick={()=>setFilterDesig('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#c77700', fontSize:14, padding:0, lineHeight:1 }}>×</button>
            </span>}
          </div>
        )}
      </div>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:20 }}>
        {[
          { lbl:'Active employees',   val:kpi?.totalEmployees??0,    cur:false },
          { lbl:'Last gross payroll', val:kpi?.totalGross??0,        cur:true  },
          { lbl:'Last net payroll',   val:kpi?.totalNet??0,          cur:true  },
          { lbl:'Total deductions',   val:kpi?.totalDeductions??0,   cur:true  },
          { lbl:'Active loans',       val:kpi?.activeLoans??0,       cur:false },
          { lbl:'Payruns this year',  val:kpi?.processedPayruns??0,  cur:false },
        ].map(k=>(
          <div key={k.lbl} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'16px 16px 14px', boxShadow:'var(--sh-sm)' }}>
            <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-.02em', color:'var(--ink)' }}>
              {k.cur ? formatCurrency(k.val as number, cur) : (k.val as number).toLocaleString()}
            </div>
            <div style={{ fontSize:12, color:'var(--ink-4)', marginTop:5, fontWeight:500 }}>{k.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Charts ────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:18 }}>
        {/* Trend */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
          <div style={{ padding:'16px 20px 4px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Monthly payroll trend</span>
            <span style={{ fontSize:12, color:'var(--ink-3)' }}>{filterYear}</span>
          </div>
          <div style={{ padding:'8px 16px 16px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top:5, right:8, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0a84ff" stopOpacity={.18}/><stop offset="95%" stopColor="#0a84ff" stopOpacity={0}/></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#28a745" stopOpacity={.18}/><stop offset="95%" stopColor="#28a745" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="label" tick={{ fontSize:11, fill:'var(--ink-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'var(--ink-3)' }} axisLine={false} tickLine={false} tickFormatter={v=>cur==='AED'?`${(v/1000).toFixed(0)}K`:`${(v/100000).toFixed(1)}L`} />
                <Tooltip formatter={(v:any)=>formatCurrency(v,cur)} contentStyle={{ borderRadius:10, border:'1px solid var(--line)', background:'var(--surface)', fontSize:13 }} />
                <Area type="monotone" dataKey="gross" stroke="#0a84ff" strokeWidth={2} fill="url(#g1)" name="Gross" />
                <Area type="monotone" dataKey="net"   stroke="#28a745" strokeWidth={2} fill="url(#g2)" name="Net"   />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By dept */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
          <div style={{ padding:'16px 20px 4px' }}>
            <span style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Payroll by department</span>
          </div>
          <div style={{ padding:'8px 16px 16px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData2} margin={{ top:5, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="department" tick={{ fontSize:10, fill:'var(--ink-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'var(--ink-3)' }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v:any)=>formatCurrency(v,cur)} contentStyle={{ borderRadius:10, border:'1px solid var(--line)', background:'var(--surface)', fontSize:13 }} />
                <Bar dataKey="gross" fill="#0a84ff" radius={[6,6,0,0]} name="Gross" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Decomposition tree (collapsible) ───────────────── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
        {/* Header - click to collapse/expand */}
        <div onClick={()=>setDecompOpen(v=>!v)} style={{ padding:'16px 20px', borderBottom: decompOpen ? '1px solid var(--line)' : 'none', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', transition:'background .1s' }}
          onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
          onMouseLeave={e=>(e.currentTarget.style.background='')}>
          <div>
            <span style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Decomposition tree</span>
            <span style={{ fontSize:13, color:'var(--ink-4)', marginLeft:10 }}>Payroll by department → employee</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <a href="/analytics/decomposition" onClick={e=>e.stopPropagation()}
              style={{ fontSize:13, color:'#0a84ff', fontWeight:600, textDecoration:'none', padding:'5px 12px', background:'#e8f1fe', borderRadius:8 }}>
              Full page ↗
            </a>
            <span style={{ fontSize:18, color:'var(--ink-3)', transition:'transform .2s', display:'inline-block', transform: decompOpen ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
          </div>
        </div>

        {/* Collapsible content */}
        {decompOpen && (
          <div style={{ padding:20 }}>
            {!decomp || !(decomp as any).departments?.length ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 0', textAlign:'center' }}>
                <div style={{ fontSize:36, opacity:.3, marginBottom:12 }}>📊</div>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Run a payroll first</div>
                <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:4 }}>Process a pay run to see the decomposition tree</div>
              </div>
            ) : (
              <div>
                {/* Total header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, padding:'14px 18px', background:'var(--bg)', borderRadius:12 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--ink-3)' }}>Total gross payroll</div>
                  <div style={{ fontSize:22, fontWeight:700, fontVariantNumeric:'tabular-nums', color:'var(--ink)' }}>{formatCurrency((decomp as any).total||0, cur)}</div>
                </div>

                {/* Department rows — collapsible */}
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {((decomp as any).departments||[]).map((dept:any, di:number)=>(
                    <div key={dept.id} style={{ border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}>
                      {/* Dept header */}
                      <div onClick={()=>toggle(dept.id)}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', cursor:'pointer', background:'var(--bg)', borderLeft:`4px solid ${COLORS[di%COLORS.length]}`, transition:'background .1s' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='var(--line)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='var(--bg)')}>
                        <span style={{ fontSize:14, color:'var(--ink-3)', transition:'transform .2s', display:'inline-block', transform: expanded.has(dept.id)?'rotate(90deg)':'rotate(0)' }}>›</span>
                        <div style={{ flex:1 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{dept.name}</span>
                          <span style={{ fontSize:12, color:'var(--ink-3)', marginLeft:10 }}>{dept.employees?.length} employee{dept.employees?.length!==1?'s':''} · {dept.pct}% of payroll</span>
                        </div>
                        <div style={{ fontWeight:700, fontSize:15, fontVariantNumeric:'tabular-nums', color:'var(--ink)' }}>{formatCurrency(dept.gross||0, cur)}</div>
                        {/* Progress bar */}
                        <div style={{ width:80, height:6, background:'var(--line)', borderRadius:3, flexShrink:0 }}>
                          <div style={{ width:`${dept.pct||0}%`, height:'100%', background:COLORS[di%COLORS.length], borderRadius:3 }} />
                        </div>
                      </div>

                      {/* Employee rows */}
                      {expanded.has(dept.id) && (
                        <div>
                          {(dept.employees||[]).map((emp:any, ei:number)=>(
                            <div key={emp.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px 11px 44px', borderTop:'1px solid var(--line)', transition:'background .1s' }}
                              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                              onMouseLeave={e=>(e.currentTarget.style.background='')}>
                              {/* Avatar */}
                              <div style={{ width:30, height:30, borderRadius:'50%', background:`${COLORS[di%COLORS.length]}22`, color:COLORS[di%COLORS.length], fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                                {emp.photoUrl ? <img src={emp.photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : initials(emp.name)}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.name}</div>
                                <div style={{ fontSize:11.5, color:'var(--ink-3)' }}>{emp.designation}</div>
                              </div>
                              <div style={{ textAlign:'right', flexShrink:0 }}>
                                <div style={{ fontSize:13.5, fontWeight:600, fontVariantNumeric:'tabular-nums', color:'var(--ink)' }}>{formatCurrency(emp.gross||0, cur)}</div>
                                <div style={{ fontSize:11.5, color:'var(--ink-3)' }}>Net {formatCurrency(emp.net||0, cur)}</div>
                              </div>
                              {/* Employee bar */}
                              <div style={{ width:60, height:4, background:'var(--line)', borderRadius:2, flexShrink:0 }}>
                                <div style={{ width:`${dept.gross>0?Math.round(emp.gross/dept.gross*100):0}%`, height:'100%', background:COLORS[di%COLORS.length], borderRadius:2 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

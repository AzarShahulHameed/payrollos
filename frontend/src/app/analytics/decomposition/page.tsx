'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { analyticsApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';

export default function DecompositionPage() {
  const { region } = useRegionStore();
  const cur = region === 'UAE' ? 'AED' : '₹';
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['all']));

  const { data: tree, isLoading } = useQuery({
    queryKey: ['decompose', region],
    queryFn: () => analyticsApi.getDecomposition({ region }),
    staleTime: 0,
  });

  const total = (tree as any)?.total || 0;
  const depts = (tree as any)?.departments || [];

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const pct = (v: number) => total > 0 ? Math.round(v / total * 100) : 0;

  return (
    <AppLayout>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
          <a href="/analytics" style={{ fontSize:13.5, color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>← Analytics</a>
          <span style={{ color:'var(--ink-3)' }}>/</span>
          <span style={{ fontSize:13.5, color:'var(--ink-3)' }}>Decomposition tree</span>
        </div>
        <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em', color:'var(--ink)' }}>Payroll decomposition</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Gross payroll breakdown by department → employee</p>
      </div>

      {/* Total */}
      <div style={{ background:'linear-gradient(135deg,#0a84ff,#0055cc)', borderRadius:16, padding:'24px 28px', color:'#fff', marginBottom:20 }}>
        <div style={{ fontSize:13, opacity:.8, marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Total gross payroll</div>
        <div style={{ fontSize:40, fontWeight:800, fontVariantNumeric:'tabular-nums', letterSpacing:'-.02em' }}>{formatCurrency(total, cur)}</div>
        <div style={{ fontSize:13, opacity:.7, marginTop:8 }}>{depts.length} department{depts.length !== 1 ? 's' : ''} · {depts.reduce((a:number,d:any) => a + d.employees.length, 0)} employee{depts.reduce((a:number,d:any) => a + d.employees.length, 0) !== 1 ? 's' : ''}</div>
      </div>

      {isLoading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--ink-3)' }}>Loading decomposition…</div>
      ) : depts.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:16, padding:'52px 24px', textAlign:'center' }}>
          <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>📊</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Run a payroll to see the decomposition tree</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {depts.map((dept: any) => (
            <div key={dept.id} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
              {/* Department header */}
              <div onClick={() => toggle(dept.id)} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <div style={{ fontSize:16, transition:'transform .2s', transform: expanded.has(dept.id) ? 'rotate(90deg)' : 'rotate(0)' }}>›</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'var(--ink)' }}>{dept.name}</div>
                  <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>{dept.employees.length} employee{dept.employees.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:16, fontVariantNumeric:'tabular-nums', color:'var(--ink)' }}>{formatCurrency(dept.gross, cur)}</div>
                  <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>{pct(dept.gross)}% of total</div>
                </div>
                {/* Bar */}
                <div style={{ width:120, height:8, background:'var(--line)', borderRadius:4, flexShrink:0 }}>
                  <div style={{ width:`${pct(dept.gross)}%`, height:'100%', background:'#0a84ff', borderRadius:4, transition:'width .4s' }} />
                </div>
              </div>

              {/* Employees */}
              {expanded.has(dept.id) && (
                <div style={{ borderTop:'1px solid var(--line)' }}>
                  {dept.employees.map((emp: any, i: number) => (
                    <div key={emp.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 20px 13px 48px', borderBottom: i < dept.employees.length - 1 ? '1px solid var(--line)' : undefined }}>
                      {/* Avatar */}
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                        {emp.photoUrl ? <img src={emp.photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : `${emp.name?.split(' ').map((w:string) => w[0]).join('').slice(0,2)}`}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13.5, color:'var(--ink)' }}>{emp.name}</div>
                        <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:1 }}>{emp.designation}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontWeight:600, fontSize:14, fontVariantNumeric:'tabular-nums', color:'var(--ink)' }}>{formatCurrency(emp.gross, cur)}</div>
                        <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2 }}>Net: {formatCurrency(emp.net, cur)}</div>
                      </div>
                      {/* Bar */}
                      <div style={{ width:80, height:6, background:'var(--line)', borderRadius:3, flexShrink:0 }}>
                        <div style={{ width:`${dept.gross > 0 ? Math.round(emp.gross / dept.gross * 100) : 0}%`, height:'100%', background:'#28a745', borderRadius:3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

'use client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api, analyticsApi, payrunApi } from '@/lib/api';
import { useRegionStore, useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AV_C = ['#0a84ff','#28a745','#ff9500','#af52de','#ff375f'];
const avColor = (n?: string) => AV_C[(n?.charCodeAt(0)||0) % AV_C.length];

export default function DashboardPage() {
  const { region } = useRegionStore();
  const { user } = useAuthStore();
  const cur = region === 'UAE' ? 'AED' : 'INR';
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dayStr = now.toLocaleDateString('en', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const { data: kpi, isError: kpiError } = useQuery({
    queryKey: ['kpi', region],
    queryFn: () => analyticsApi.getKpi(region),
    staleTime: 0,
    retry: 2,
  });
  const { data: trend = [] } = useQuery({
    queryKey: ['trend', region],
    queryFn: () => analyticsApi.getTrend(region),
    staleTime: 0,
    retry: 2,
  });
  const { data: byDept = [] } = useQuery({
    queryKey: ['dept', region],
    queryFn: () => analyticsApi.getByDepartment(region),
    staleTime: 0,
    retry: 2,
  });
  const { data: payruns = [] } = useQuery({
    queryKey: ['payruns', region],
    queryFn: () => payrunApi.getAll({ region }),
    staleTime: 0,
  });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const statusCls: Record<string,string> = { DRAFT:'chip-gray', IN_REVIEW:'chip-warn', APPROVED:'chip-info', PROCESSED:'chip-info', PAID:'chip-ok', CANCELLED:'chip-danger' };

  return (
    <AppLayout>
      <div className="page-head stagger" style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background: avColor(user?.firstName), flexShrink:0, overflow:'hidden', border:'3px solid rgba(255,255,255,.8)', boxShadow:'0 2px 12px rgba(0,0,0,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff' }}>
          {user?.photoUrl
            ? <img src={user.photoUrl} alt={user?.firstName || 'User'} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            : `${user?.firstName?.[0]||''}${user?.lastName?.[0]||''}`
          }
        </div>
        <div>
          <h2 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>{greeting}, {user?.firstName || 'there'} 👋</h2>
          <p style={{ color:'var(--ink-3)', fontSize:14, marginTop:4 }}>{dayStr} · {region==='UAE'?'UAE':'India'} payroll workspace</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid stagger">
        {[
          { val: kpi?.totalEmployees ?? 0,    lbl:'Active employees',  fmt:'num' },
          { val: kpi?.totalGross ?? 0,        lbl:'Last gross payroll', fmt:'cur' },
          { val: kpi?.totalNet ?? 0,           lbl:'Last net payroll',   fmt:'cur' },
          { val: kpi?.totalDeductions ?? 0,    lbl:'Total deductions',   fmt:'cur' },
          { val: kpi?.activeLoans ?? 0,        lbl:'Active loans',       fmt:'num' },
          { val: kpi?.processedPayruns ?? 0,   lbl:'Payruns this year',  fmt:'num' },
        ].map(k => (
          <div key={k.lbl} className="kpi">
          <div className="kpi-val">{k.fmt === 'cur' ? formatCurrency(k.val, cur) : (k.val as number).toLocaleString()}</div>
            <div className="kpi-lbl">{k.lbl}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid g2 stagger" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-hd"><span className="card-title">Payroll trend</span><span className="muted">12 months</span></div>
          <div style={{ padding: '16px 20px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend as any[]} margin={{ top:5, right:8, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0a84ff" stopOpacity={.18}/><stop offset="95%" stopColor="#0a84ff" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#28a745" stopOpacity={.18}/><stop offset="95%" stopColor="#28a745" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" />
                <XAxis dataKey="label" tick={{ fontSize:11, fill:'#a1a1a6' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'#a1a1a6' }} axisLine={false} tickLine={false} tickFormatter={v => cur==='AED'?`${(v/1000).toFixed(0)}K`:`${(v/100000).toFixed(1)}L`} />
                <Tooltip formatter={(v:any) => formatCurrency(v, cur)} contentStyle={{ borderRadius:10, border:'1px solid #e3e3e6', fontSize:13 }} />
                <Area type="monotone" dataKey="gross" stroke="#0a84ff" strokeWidth={2} fill="url(#gG)" name="Gross" />
                <Area type="monotone" dataKey="net"   stroke="#28a745" strokeWidth={2} fill="url(#gN)"  name="Net"   />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">By department</span></div>
          <div style={{ padding: '16px 20px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDept as any[]} margin={{ top:5, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" />
                <XAxis dataKey="department" tick={{ fontSize:10, fill:'#a1a1a6' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#a1a1a6' }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v:any) => formatCurrency(v, cur)} contentStyle={{ borderRadius:10, border:'1px solid #e3e3e6', fontSize:13 }} />
                <Bar dataKey="gross" fill="#0a84ff" radius={[5,5,0,0]} name="Gross" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent payruns */}
      <div className="table-wrap">
        <div className="table-head">
          <h3>Recent payruns</h3>
          <a href="/payrun" style={{ fontSize:13.5, color:'var(--accent)', fontWeight:600, textDecoration:'none' }}>View all →</a>
        </div>
        <table>
          <thead><tr><th>Period</th><th>Employees</th><th className="r">Gross</th><th className="r">Net</th><th>Status</th></tr></thead>
          <tbody>
            {(payruns as any[]).length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state" style={{ padding:'36px 0' }}>
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">No payruns yet</div>
                  <div className="empty-sub">Open Pay run to process your first payroll</div>
                </div>
              </td></tr>
            ) : (payruns as any[]).slice(0, 6).map((p: any) => (
              <tr key={p.id}>
                <td className="td-bold">{months[(p.month||1)-1]} {p.year}</td>
                <td className="td-muted">{p.employeeCount ?? 0}</td>
                <td className="r td-mono">{formatCurrency(p.totalGross??0, cur)}</td>
                <td className="r td-mono td-bold">{formatCurrency(p.totalNet??0, cur)}</td>
                <td><span className={`chip ${statusCls[p.status]||'chip-gray'}`}><span className="dot"/>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

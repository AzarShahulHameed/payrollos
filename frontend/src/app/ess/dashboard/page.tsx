'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import ESSLayout from '@/components/layout/ESSLayout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
 
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const LEAVE_COLORS: Record<string,string> = { ANNUAL:'#0a84ff', SICK:'#ff9500', CASUAL:'#28a745', MATERNITY:'#af52de', PATERNITY:'#30b0c7', UNPAID:'#6e6e73' };
 
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
 
function daysBetween(a: Date, b: Date) {
  return Math.round(Math.abs(b.getTime()-a.getTime())/86400000);
}
 
export default function ESSDashboard() {
  const { user } = useAuthStore();
  const now = new Date();
  const yr  = now.getFullYear();
  const mo  = now.getMonth() + 1;
 
  // ── Fetch all data ─────────────────────────────────────────
  const { data: slips = [] } = useQuery({
    queryKey: ['my-slips'],
    queryFn: () => api.get('/payslips/my').then(r => r.data),
  });
 
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/employees/me').then(r => r.data),
  });
 
  const { data: leaveData = [] } = useQuery({
    queryKey: ['my-leaves-dash'],
    queryFn: () => api.get('/leaves', { params: { myLeaves: 'true' } }).then(r => r.data),
  });
 
  const { data: balances = [] } = useQuery({
    queryKey: ['my-leave-balances', yr],
    queryFn: async () => {
      if (!profile?.id) return [];
      return api.get(`/leaves/${profile.id}/balances`, { params: { year: yr } }).then(r => r.data);
    },
    enabled: !!profile?.id,
  });
 
  const { data: attendance } = useQuery({
    queryKey: ['my-attendance-dash', yr, mo],
    queryFn: () => api.get(`/attendance/my`, { params: { year: yr, month: mo } }).then(r => r.data).catch(() => null),
  });
 
  const { data: loans = [] } = useQuery({
    queryKey: ['my-loans-dash'],
    queryFn: () => api.get('/loans', { params: { myLoans: 'true' } }).then(r => r.data).catch(() => []),
  });
 
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data).catch(() => null),
  });
 
  // ── Derived values ─────────────────────────────────────────
  const emp        = profile as any;
  const allSlips   = slips as any[];
  const allLeaves  = leaveData as any[];
  const allBalance = balances as any[];
  const allLoans   = loans as any[];
 
  const latest     = allSlips[0];
  const cur        = latest?.region === 'INDIA' ? 'INR' : 'AED';
 
  // Next pay date
  const payDay     = (settings as any)?.payDay || 28;
  const nextPay    = new Date(yr, payDay <= now.getDate() ? mo : mo-1, payDay);
  if (nextPay < now) nextPay.setMonth(nextPay.getMonth()+1);
  const daysToPayday = daysBetween(now, nextPay);
 
  // Attendance this month
  const attRecords  = (attendance as any)?.records || [];
  const presentDays = attRecords.filter((r:any) => r.status === 'PRESENT').length;
  const absentDays  = attRecords.filter((r:any) => r.status === 'ABSENT').length;
  const totalHours  = attRecords.reduce((s:number,r:any) => s + (r.hoursWorked||0), 0);
 
  // Active loan
  const activeLoan  = allLoans.find((l:any) => l.status === 'ACTIVE');
 
  // Pending requests
  const pendingLeaves = allLeaves.filter((l:any) => l.status === 'PENDING').length;
 
  // Today clock status
  const todayStr    = now.toISOString().split('T')[0];
  const todayAtt    = attRecords.find((r:any) => r.date?.startsWith(todayStr));
 
  const name = `${user?.firstName||''} ${user?.lastName||''}`.trim();
 
  return (
    <ESSLayout>
      {/* ── Greeting ──────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em', color:'var(--ink)', marginBottom:4 }}>
          {greeting()}, {user?.firstName}
        </h1>
        <p style={{ fontSize:14, color:'var(--ink-3)' }}>
          {now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </p>
      </div>
 
      {/* ── Clock in/out status bar ───────────────────────── */}
      <div style={{ background: todayAtt?.checkIn && !todayAtt?.checkOut ? '#e7f6ea' : todayAtt?.checkOut ? '#f2f2f7' : 'var(--surface)', border:`1px solid ${todayAtt?.checkIn && !todayAtt?.checkOut ? '#28a74533' : 'var(--line)'}`, borderRadius:12, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background: todayAtt?.checkOut ? '#6e6e73' : todayAtt?.checkIn ? '#28a745' : '#ff9500', flexShrink:0 }} />
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>
              {todayAtt?.checkOut ? 'Completed today' : todayAtt?.checkIn ? 'Currently clocked in' : 'Not clocked in yet'}
            </div>
            {todayAtt?.checkIn && (
              <div style={{ fontSize:12.5, color:'var(--ink-3)', marginTop:2 }}>
                In: {new Date(todayAtt.checkIn).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                {todayAtt.checkOut && ` · Out: ${new Date(todayAtt.checkOut).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`}
                {todayAtt.hoursWorked && ` · ${todayAtt.hoursWorked.toFixed(1)}h`}
              </div>
            )}
          </div>
        </div>
        {!todayAtt?.checkOut && (
          <Link href="/ess/attendance" style={{ textDecoration:'none' }}>
            <span style={{ padding:'8px 18px', background: todayAtt?.checkIn ? '#d83933' : '#28a745', color:'#fff', borderRadius:8, fontSize:13.5, fontWeight:600, cursor:'pointer' }}>
              {todayAtt?.checkIn ? 'Clock out' : 'Clock in'}
            </span>
          </Link>
        )}
      </div>
 
      {/* ── KPI cards ─────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {/* Last net pay */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'18px 20px', boxShadow:'var(--sh-sm)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Last net pay</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>
            {latest ? formatCurrency(latest.netSalary||0, cur) : '—'}
          </div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:5 }}>
            {latest ? `${MONTHS[(latest.payrun?.month||1)-1]} ${latest.payrun?.year}` : 'No payslips yet'}
          </div>
        </div>
 
        {/* Next pay date */}
        <div style={{ background:'linear-gradient(135deg,#0a84ff,#0055cc)', border:'none', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(10,132,255,.25)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.75)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Next pay date</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#fff' }}>
            {payDay} {FULL_MONTHS[nextPay.getMonth()]}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', marginTop:5 }}>
            {daysToPayday === 0 ? 'Today!' : `In ${daysToPayday} day${daysToPayday!==1?'s':''}`}
          </div>
        </div>
 
        {/* This month attendance */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'18px 20px', boxShadow:'var(--sh-sm)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>This month</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>
            {presentDays} <span style={{ fontSize:13, fontWeight:400, color:'var(--ink-3)' }}>days present</span>
          </div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:5 }}>
            {totalHours.toFixed(0)}h worked · {absentDays} absent
          </div>
        </div>
 
        {/* Pending requests */}
        <div style={{ background:'var(--surface)', border:`1px solid ${pendingLeaves>0?'#c7770044':'var(--line)'}`, borderRadius:14, padding:'18px 20px', boxShadow:'var(--sh-sm)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Pending</div>
          <div style={{ fontSize:22, fontWeight:800, color:pendingLeaves>0?'#c77700':'var(--ink)', fontVariantNumeric:'tabular-nums' }}>
            {pendingLeaves}
          </div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:5 }}>
            leave request{pendingLeaves!==1?'s':''} awaiting approval
          </div>
        </div>
      </div>
 
      {/* ── Main content grid ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:20 }}>
 
        {/* Leave balances */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Leave balance</span>
            <Link href="/ess/leaves" style={{ fontSize:13, color:'#0a84ff', textDecoration:'none', fontWeight:600 }}>Apply →</Link>
          </div>
          <div style={{ padding:'8px 0' }}>
            {allBalance.length === 0 ? (
              <div style={{ padding:'24px 20px', textAlign:'center', color:'var(--ink-3)', fontSize:13.5 }}>No leave balances set up yet</div>
            ) : allBalance.map((b:any) => (
              <div key={b.id} style={{ display:'flex', alignItems:'center', padding:'10px 20px', gap:14 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:(LEAVE_COLORS[b.leaveType]||'#6e6e73')+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:LEAVE_COLORS[b.leaveType]||'#6e6e73' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:500, color:'var(--ink)', marginBottom:4 }}>{b.leaveType?.replace(/_/g,' ')}</div>
                  <div style={{ height:4, background:'var(--line)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${b.total>0?Math.round((b.remaining/b.total)*100):0}%`, background:LEAVE_COLORS[b.leaveType]||'#6e6e73', borderRadius:2, transition:'width .3s' }} />
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{b.remaining}</div>
                  <div style={{ fontSize:11, color:'var(--ink-3)' }}>of {b.total}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
 
        {/* Recent payslips */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Recent payslips</span>
            <Link href="/ess/payslips" style={{ fontSize:13, color:'#0a84ff', textDecoration:'none', fontWeight:600 }}>View all →</Link>
          </div>
          {allSlips.length === 0 ? (
            <div style={{ padding:'24px 20px', textAlign:'center', color:'var(--ink-3)', fontSize:13.5 }}>No payslips yet</div>
          ) : allSlips.slice(0,4).map((s:any) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', padding:'12px 20px', borderBottom:'1px solid var(--line)', justifyContent:'space-between' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
              onMouseLeave={e=>(e.currentTarget.style.background='')}>
              <div>
                <div style={{ fontWeight:600, fontSize:13.5, color:'var(--ink)' }}>{MONTHS[(s.payrun?.month||1)-1]} {s.payrun?.year}</div>
                <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>Gross {formatCurrency(s.grossSalary||0,cur)}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:14, fontVariantNumeric:'tabular-nums', color:'var(--ink)' }}>{formatCurrency(s.netSalary||0,cur)}</div>
                  <span style={{ background:s.status==='PAID'?'#e7f6ea':'#f2f2f7', color:s.status==='PAID'?'#28a745':'#6e6e73', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:999 }}>{s.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
 
      {/* ── Bottom row ────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
 
        {/* Salary breakdown */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
            <span style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>My salary</span>
          </div>
          {!emp?.salaryStructure ? (
            <div style={{ padding:'24px 20px', textAlign:'center', color:'var(--ink-3)', fontSize:13.5 }}>Salary not configured. Contact HR.</div>
          ) : (
            <div style={{ padding:'16px 20px' }}>
              <div style={{ fontSize:28, fontWeight:800, color:'var(--ink)', fontVariantNumeric:'tabular-nums', marginBottom:4 }}>
                {formatCurrency(emp.salaryStructure.basicSalary || Math.round((emp.salaryStructure.ctcAnnual||0)/12), cur)}
              </div>
              <div style={{ fontSize:12.5, color:'var(--ink-3)', marginBottom:16 }}>
                {emp.salaryStructure.basicSalary ? 'Basic salary / month' : 'Monthly equivalent'}
              </div>
              {emp.salaryStructure.basicSalary > 0 && [
                ['Housing', emp.salaryStructure.housingAllowance],
                ['Transport', emp.salaryStructure.transportAllowance],
                ['Medical', emp.salaryStructure.medicalAllowance],
              ].filter(([,v]) => v > 0).map(([l,v]:any) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--line)', fontSize:13 }}>
                  <span style={{ color:'var(--ink-2)' }}>{l}</span>
                  <span style={{ color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{formatCurrency(v,cur)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
 
        {/* Active loan + quick links */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Active loan */}
          {activeLoan && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'18px 20px', boxShadow:'var(--sh-sm)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Active loan</div>
              <div style={{ fontSize:20, fontWeight:700, color:'var(--ink)', marginBottom:4 }}>{formatCurrency(activeLoan.amount, cur)}</div>
              <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>
                {activeLoan.installments} months · {formatCurrency(Math.ceil(activeLoan.amount/activeLoan.installments), cur)}/month EMI
              </div>
              <div style={{ marginTop:10, height:4, background:'var(--line)', borderRadius:2 }}>
                <div style={{ height:'100%', width:'40%', background:'#0a84ff', borderRadius:2 }} />
              </div>
            </div>
          )}
 
          {/* Quick actions */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, padding:'18px 20px', boxShadow:'var(--sh-sm)', flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Quick actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { href:'/ess/leaves',         label:'Apply for leave',      color:'#0a84ff' },
                { href:'/ess/loans',          label:'Request a loan',       color:'#28a745' },
                { href:'/ess/reimbursements', label:'Submit expense claim', color:'#ff9500' },
                { href:'/ess/documents',      label:'Upload document',      color:'#af52de' },
              ].map(({ href, label, color }) => (
                <Link key={href} href={href} style={{ textDecoration:'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, border:'1px solid var(--line)', cursor:'pointer', transition:'background .1s' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
                    <span style={{ fontSize:13.5, color:'var(--ink)', fontWeight:500 }}>{label}</span>
                    <span style={{ marginLeft:'auto', color:'var(--ink-4)', fontSize:16 }}>›</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ESSLayout>
  );
}
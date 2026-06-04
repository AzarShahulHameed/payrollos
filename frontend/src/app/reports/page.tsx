'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { reportsApi } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';

const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const REPORT_TYPES = [
  { id:'salary-register', label:'Salary register', icon:'📋', regions:['UAE','INDIA'] },
  { id:'payroll-summary', label:'Payroll summary', icon:'💰', regions:['UAE','INDIA'] },
  { id:'pf-esi-challan', label:'PF & ESI challan', icon:'🏦', regions:['INDIA'] },
  { id:'wps',            label:'WPS report',       icon:'🏛️', regions:['UAE'] },
  { id:'form16',         label:'Form 16',           icon:'🧾', regions:['INDIA'] },
];

function WPSReport({ year, month }: { year: number; month: number }) {
  const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const { data: payruns = [] } = useQuery({
    queryKey: ['payruns-wps', year, month],
    queryFn: () => import('@/lib/api').then(m => m.payrunApi.getAll({ region: 'UAE' })),
  });
  const paid = (payruns as any[]).find((p: any) => p.year === year && p.month === month && ['PROCESSED','PAID'].includes(p.status));

  const downloadWPS = async () => {
    if (!paid) return;
    const { api } = await import('@/lib/api');
    const res = await api.get(`/wps/${paid.id}`, { responseType: 'text' });
    const blob = new Blob([res.data], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `WPS-SIF-${MONTHS_S[month-1]}-${year}.sif`; a.click();
  };

  const downloadBankCSV = async () => {
    if (!paid) return;
    const { api } = await import('@/lib/api');
    const res = await api.get(`/reports/bank-transfer/${paid.id}`, { responseType: 'text' });
    const blob = new Blob([res.data], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Bank-Transfer-${MONTHS_S[month-1]}-${year}.csv`; a.click();
  };

  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 28, boxShadow: 'var(--sh-sm)' }}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>WPS & Bank Transfer · {MONTHS_S[month-1]} {year}</div>
      <div style={{ background: '#e8f1fe', border: '1px solid rgba(10,132,255,.2)', borderRadius: 10, padding: '13px 16px', fontSize: 13, color: '#0055b0', lineHeight: 1.6, marginBottom: 20 }}>
        <strong>WPS SIF file</strong> is formatted per Central Bank of UAE specifications.
        Upload to your bank's WPS portal (Emirates NBD, FAB, Mashreq etc.) to process salary payments.
      </div>
      {!paid ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', textAlign: 'center', color: 'var(--ink-4)' }}>
          <div style={{ fontSize: 40, opacity: .3, marginBottom: 14 }}>🏛️</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>No processed payruns for {MONTHS_S[month-1]} {year}</div>
          <div style={{ fontSize: 13, marginTop: 5 }}>Mark a payrun as PAID to generate WPS file</div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#f7f9fc', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: '#a1a1a6', marginBottom: 4 }}>Payrun</div>
              <div style={{ fontWeight: 600 }}>{MONTHS_S[month-1]} {year}</div>
              <span style={{ background: '#e7f6ea', color: '#28a745', fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999 }}>{paid.status}</span>
            </div>
            <div style={{ flex: 1, background: '#f7f9fc', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: '#a1a1a6', marginBottom: 4 }}>Employees</div>
              <div style={{ fontWeight: 600, fontSize: 20 }}>{paid.employeeCount}</div>
            </div>
            <div style={{ flex: 1, background: '#f7f9fc', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: '#a1a1a6', marginBottom: 4 }}>Total net pay</div>
              <div style={{ fontWeight: 600 }}>AED {(paid.totalNet || 0).toLocaleString()}</div>
            </div>
          </div>
          <div style={{ background:'#fdf3e0', border:'1px solid #c7770033', borderRadius:9, padding:'12px 16px', fontSize:13, color:'#c77700', marginBottom:12 }}>
            <strong>Before downloading:</strong> Ensure all employees have their IBAN entered in their profile.
            Employees without IBAN will show as 00000 in the SIF file which the bank will reject.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={downloadWPS}
              style={{ flex: 1, padding: '12px 0', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ↓ Download WPS SIF file
            </button>
            <button onClick={downloadBankCSV}
              style={{ flex: 1, padding: '12px 0', background: '#fff', color: '#1d1d1f', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ↓ Bank transfer CSV (NEFT/RTGS)
            </button>
          </div>
          <div style={{ marginTop:16, padding:'14px 16px', background:'#f7f9fc', borderRadius:9, fontSize:12.5, color:'#6e6e73', lineHeight:1.6 }}>
            <strong>How UAE salary payment works:</strong><br/>
            1. Mark payrun as PAID in Pay run page<br/>
            2. Download WPS SIF file from here<br/>
            3. Log in to your bank portal (Emirates NBD / FAB / Mashreq)<br/>
            4. Upload the SIF file — the bank processes all salaries on the pay date<br/>
            5. Bank debits your company account and credits each employee's account<br/>
            <br/>
            This is the standard WPS process mandated by the UAE Ministry of Human Resources.
            Configure your bank name and routing code in Settings → Statutory.
          </div>
        </div>
      )}
    </div>
  );
}



function exportPayrollCSV(payslips: any[], cur: string) {
  const headers = ['Employee Code','Name','Department','Designation','Period','Basic','Housing','Transport','Medical','Gross','PF','ESI','TDS','Loan EMI','Total Deductions','Net Pay','Status'];
  const rows = payslips.map((s:any) => [
    s.employee?.employeeCode||'',
    (s.employee?.firstName||'')+' '+(s.employee?.lastName||''),
    s.employee?.department?.name||'',
    s.employee?.designation||'',
    (s.payrun?.month||'')+'/'+( s.payrun?.year||''),
    s.basicSalary||0,
    s.housingAllowance||0,
    s.transportAllowance||0,
    s.medicalAllowance||0,
    s.grossSalary||0,
    s.pfEmployee||0,
    s.esiEmployee||0,
    s.tdsAmount||0,
    s.loanDeduction||0,
    s.totalDeductions||0,
    s.netSalary||0,
    s.status||'',
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `payroll-register-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export default function ReportsPage() {
  const { region } = useRegionStore();
  const now = new Date();
  const [reportType, setReportType] = useState('salary-register');
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());
  const [employeeId, setEmployeeId] = useState('');
  const cur = region==='UAE'?'AED':'INR';

  const available = REPORT_TYPES.filter(r => r.regions.includes(region));

  const { data: salaryReg = [], isLoading: srLoad } = useQuery({
    queryKey: ['sr', year, month, region], enabled: reportType==='salary-register',
    queryFn: () => reportsApi.getSalaryRegister(year, month, region),
  });
  const { data: pfEsi = [], isLoading: pfLoad } = useQuery({
    queryKey: ['pf-esi', year, month], enabled: reportType==='pf-esi-challan' && region==='INDIA',
    queryFn: () => reportsApi.getPfEsiChallan(year, month),
  });
  const { data: form16 } = useQuery({
    queryKey: ['form16', employeeId, year], enabled: reportType==='form16' && !!employeeId,
    queryFn: () => reportsApi.getForm16(employeeId, year),
  });

  const exportCSV = (data: any[], name: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify(r[h]??'')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = name; a.click();
  };

  return (
    <AppLayout>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.02em' }}>Reports</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Payroll reports and compliance documents · {region}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20, alignItems:'start' }}>
        {/* Report type nav */}
        <nav style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, padding:8, boxShadow:'var(--sh-sm)' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.05em', padding:'6px 10px 8px' }}>Report type</div>
          {available.map(r => (
            <button key={r.id} onClick={()=>setReportType(r.id)} style={{
              display:'flex', alignItems:'center', gap:9, width:'100%', padding:'9px 11px',
              border:'none', background: reportType===r.id ? '#0a84ff' : 'transparent',
              color: reportType===r.id ? '#fff' : 'var(--ink-3)',
              borderRadius:9, fontSize:13.5, fontWeight: reportType===r.id ? 600 : 400,
              cursor:'pointer', textAlign:'left', fontFamily:'inherit', marginBottom:2,
              boxShadow: reportType===r.id ? 'var(--sh-sm)' : 'none', transition:'all .12s',
            }}>
              <span style={{ fontSize:15 }}>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div>
          {/* Controls */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <select value={month} onChange={e=>setMonth(+e.target.value)} style={{ height:34, padding:'0 28px 0 10px', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, background:'#fff', fontFamily:'inherit', outline:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center', WebkitAppearance:'none' }}>
              {MONTHS_L.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e=>setYear(+e.target.value)} style={{ height:34, padding:'0 28px 0 10px', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, background:'#fff', fontFamily:'inherit', outline:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center', WebkitAppearance:'none' }}>
              {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
            </select>
            {reportType==='form16' && (
              <input value={employeeId} onChange={e=>setEmployeeId(e.target.value)} placeholder="Employee ID" style={{ height:34, padding:'0 12px', border:'1px solid var(--line-2)', borderRadius:9, fontSize:13.5, fontFamily:'inherit', outline:'none', minWidth:180 }} />
            )}
            {['salary-register','pf-esi-challan'].includes(reportType) && (
              <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={()=>exportCSV(reportType==='salary-register'?salaryReg as any[]:pfEsi as any[], `${reportType}-${year}-${month}.csv`)}>
                ↓ Export CSV
              </button>
            )}
          </div>

          {/* Salary Register */}
          {reportType==='salary-register' && (
            <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:15, fontWeight:600 }}>Salary register · {MONTHS_S[month-1]} {year}</div>
                <div style={{ fontSize:13, color:'var(--ink-4)' }}>{(salaryReg as any[]).length} employees</div>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                <thead><tr style={{ borderBottom:'1px solid var(--line)', background:'#fafafa' }}>
                  {['Employee','Dept','Gross',region==='INDIA'&&'PF Emp',region==='INDIA'&&'ESI',region==='INDIA'&&'PT',region==='INDIA'&&'TDS','Total ded.','Net pay'].filter(Boolean).map(h=>(
                    <th key={h as string} style={{ padding:'10px 16px', textAlign:typeof h==='string'&&['Gross','PF Emp','ESI','PT','TDS','Total ded.','Net pay'].includes(h)?'right':'left', fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {srLoad ? <tr><td colSpan={9} style={{ padding:24, textAlign:'center', color:'var(--ink-4)' }}>Loading…</td></tr>
                  : (salaryReg as any[]).length===0 ? (
                    <tr><td colSpan={9}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 24px', textAlign:'center' }}>
                        <div style={{ fontSize:36, opacity:.3, marginBottom:14 }}>📋</div>
                        <div style={{ fontSize:15, fontWeight:600 }}>No payroll data for this period</div>
                        <div style={{ fontSize:13.5, color:'var(--ink-4)', marginTop:5 }}>Process a pay run for {MONTHS_S[month-1]} {year} first</div>
                      </div>
                    </td></tr>
                  ) : (salaryReg as any[]).map((s:any) => (
                    <tr key={s.id} style={{ borderBottom:'1px solid rgba(0,0,0,.04)' }} onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                      <td style={{ padding:'12px 16px' }}><div style={{ fontWeight:600 }}>{s.employee?.firstName} {s.employee?.lastName}</div><div style={{ fontSize:11.5, color:'var(--ink-4)' }}>{s.employee?.employeeCode}</div></td>
                      <td style={{ padding:'12px 16px', color:'var(--ink-3)' }}>{s.employee?.department?.name||'—'}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{formatCurrency(s.grossSalary,cur)}</td>
                      {region==='INDIA'&&<><td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--ink-3)' }}>{formatCurrency(s.pfEmployee,cur)}</td><td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--ink-3)' }}>{formatCurrency(s.esiEmployee,cur)}</td><td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--ink-3)' }}>{formatCurrency(s.professionalTax,cur)}</td><td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--ink-3)' }}>{formatCurrency(s.tdsAmount,cur)}</td></>}
                      <td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--red)', fontWeight:500 }}>{formatCurrency(s.totalDeductions,cur)}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:700 }}>{formatCurrency(s.netSalary,cur)}</td>
                    </tr>
                  ))}
                </tbody>
                {(salaryReg as any[]).length > 0 && (
                  <tfoot><tr style={{ background:'#f7f9fc', borderTop:'2px solid var(--line)' }}>
                    <td colSpan={region==='INDIA'?3:3} style={{ padding:'12px 16px', fontWeight:700, fontSize:13 }}>Total ({(salaryReg as any[]).length} employees)</td>
                    {region==='INDIA'&&<><td style={{ padding:'12px 16px', textAlign:'right', fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{formatCurrency((salaryReg as any[]).reduce((a:number,s:any)=>a+s.pfEmployee,0),cur)}</td><td style={{ padding:'12px 16px', textAlign:'right', fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{formatCurrency((salaryReg as any[]).reduce((a:number,s:any)=>a+s.esiEmployee,0),cur)}</td><td style={{ padding:'12px 16px', textAlign:'right', fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{formatCurrency((salaryReg as any[]).reduce((a:number,s:any)=>a+s.professionalTax,0),cur)}</td><td style={{ padding:'12px 16px', textAlign:'right', fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{formatCurrency((salaryReg as any[]).reduce((a:number,s:any)=>a+s.tdsAmount,0),cur)}</td></>}
                    <td style={{ padding:'12px 16px', textAlign:'right', fontWeight:700, color:'var(--red)', fontVariantNumeric:'tabular-nums' }}>{formatCurrency((salaryReg as any[]).reduce((a:number,s:any)=>a+s.totalDeductions,0),cur)}</td>
                    <td style={{ padding:'12px 16px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{formatCurrency((salaryReg as any[]).reduce((a:number,s:any)=>a+s.netSalary,0),cur)}</td>
                  </tr></tfoot>
                )}
              </table>
            </div>
          )}

          {/* PF & ESI */}
          {reportType==='pf-esi-challan' && region==='INDIA' && (
            <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
                <div style={{ fontSize:15, fontWeight:600 }}>PF & ESI challan · {MONTHS_S[month-1]} {year}</div>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                <thead><tr style={{ borderBottom:'1px solid var(--line)', background:'#fafafa' }}>
                  {['Emp code','Name','UAN','Basic','PF Employee','PF Employer','ESI Employee','ESI Employer'].map(h=>(
                    <th key={h} style={{ padding:'10px 16px', textAlign:['Basic','PF Employee','PF Employer','ESI Employee','ESI Employer'].includes(h)?'right':'left', fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.03em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pfLoad ? <tr><td colSpan={8} style={{ padding:24, textAlign:'center', color:'var(--ink-4)' }}>Loading…</td></tr>
                  : (pfEsi as any[]).map((p:any,i:number)=>(
                    <tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,.04)' }} onMouseEnter={e=>(e.currentTarget.style.background='#f7f9fc')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                      <td style={{ padding:'12px 16px', color:'var(--ink-3)', fontFamily:'monospace', fontSize:12.5 }}>{p.employeeCode}</td>
                      <td style={{ padding:'12px 16px', fontWeight:600 }}>{p.name}</td>
                      <td style={{ padding:'12px 16px', color:'var(--ink-3)', fontFamily:'monospace', fontSize:12.5 }}>{p.uan||'—'}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{formatCurrency(p.basic,'INR')}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--red)' }}>{formatCurrency(p.pfEmployee,'INR')}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--red)' }}>{formatCurrency(p.pfEmployer,'INR')}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--ink-3)' }}>{formatCurrency(p.esiEmployee,'INR')}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--ink-3)' }}>{formatCurrency(p.esiEmployer,'INR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Form 16 */}
          {reportType==='form16' && region==='INDIA' && (
            <div>
              {!employeeId ? (
                <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden', boxShadow:'var(--sh-sm)' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>🧾</div>
                    <div style={{ fontSize:15, fontWeight:600 }}>Enter employee ID above</div>
                    <div style={{ fontSize:13.5, color:'var(--ink-4)', marginTop:5 }}>Type the employee ID to generate Form 16 for FY {year}–{year+1}</div>
                  </div>
                </div>
              ) : form16 ? (
                <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, padding:'32px 36px', boxShadow:'var(--sh-sm)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
                    <div><div style={{ fontSize:18, fontWeight:700 }}>Certificate of Tax Deducted at Source</div><div style={{ fontSize:13.5, color:'var(--ink-3)', marginTop:4 }}>Form 16 · FY {(form16 as any).financialYear}</div></div>
                    <button className="btn btn-ghost btn-sm" onClick={()=>window.print()}>🖨 Print</button>
                  </div>
                  <div style={{ background:'#f7f9fc', borderRadius:12, padding:20, marginBottom:24, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px 24px' }}>
                    {[['Employee',(form16 as any).employee?.name],['PAN',(form16 as any).employee?.pan||'—'],['Designation',(form16 as any).employee?.designation||'—'],['Tax regime',(form16 as any).regime],['Financial year',(form16 as any).financialYear],['Employer','']]
                      .map(([k,v])=><div key={k}><div style={{ fontSize:11, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>{k}</div><div style={{ fontWeight:500, fontSize:13.5 }}>{v||'—'}</div></div>)}
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                    <tbody>
                      {[['Gross salary',(form16 as any).annualGross,false],['Standard deduction',(form16 as any).stdDeduction,true],['PF deduction',(form16 as any).annualPf,true],['Taxable income',(form16 as any).taxableIncome,false,'bold'],['Total TDS deducted',(form16 as any).annualTds,true,'red']].map(([lbl,val,ded,style])=>(
                        <tr key={lbl as string} style={{ borderBottom:'1px solid var(--line)' }}>
                          <td style={{ padding:'12px 0', fontWeight:(style==='bold')?700:400 }}>{lbl}</td>
                          <td style={{ padding:'12px 0', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:(style==='bold')?700:500, color:(style==='red')?'var(--red)':ded?'var(--ink-3)':'var(--ink)' }}>{ded&&'−'}{formatCurrency(val as number,'INR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ padding:24, textAlign:'center', color:'var(--ink-4)' }}>Loading Form 16…</div>}
            </div>
          )}

          {/* WPS */}
          {reportType==='wps' && region==='UAE' && (
            <WPSReport year={year} month={month} />
          )}

          {/* Payroll summary */}
          {reportType==='payroll-summary' && (
            <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, padding:28, boxShadow:'var(--sh-sm)' }}>
              <div style={{ fontSize:17, fontWeight:600, marginBottom:16 }}>Payroll summary · {MONTHS_S[month-1]} {year}</div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 24px', textAlign:'center', color:'var(--ink-4)' }}>
                <div style={{ fontSize:40, opacity:.3, marginBottom:14 }}>💰</div>
                <div style={{ fontSize:14, fontWeight:500 }}>Select a payrun to view summary</div>
                <div style={{ fontSize:13, marginTop:5 }}>Open a pay run and the summary will appear here</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

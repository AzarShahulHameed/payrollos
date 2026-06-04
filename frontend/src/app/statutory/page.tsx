'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
 
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
type Tab = 'pf' | 'esi' | 'pt' | 'tds' | 'form16';
 
export default function StatutoryPage() {
  const { region } = useRegionStore();
  const now = new Date();
  const [tab, setTab] = useState<Tab>('pf');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [empId, setEmpId] = useState('');
  const [fyYear, setFyYear] = useState(now.getFullYear());
 
  // If UAE, only show gratuity tab
  if (region === 'UAE') {
    return (
      <AppLayout>
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🇦🇪</div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>UAE has no income tax</h2>
          <p style={{ color: '#6e6e73', marginTop: 8, fontSize: 14 }}>
            UAE employers have no PF, ESI, PT or TDS obligations.<br />
            Use the <a href="/gratuity" style={{ color: '#0a84ff' }}>Gratuity tracker</a> for end-of-service benefit planning.
          </p>
        </div>
      </AppLayout>
    );
  }
 
  return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Statutory compliance</h1>
          <p style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>PF · ESI · Professional Tax · TDS · Form 16</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={selStyle}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} style={selStyle}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>
 
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e3e3e6', marginBottom: 22 }}>
        {([
          ['pf',     '🏦 Provident Fund'],
          ['esi',    '🏥 ESI'],
          ['pt',     '📋 Prof. Tax'],
          ['tds',    '💸 TDS'],
          ['form16', '📄 Form 16'],
        ] as [Tab, string][]).map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', border: 'none', background: 'transparent',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            color: tab === t ? '#0a84ff' : '#6e6e73',
            borderBottom: `2.5px solid ${tab === t ? '#0a84ff' : 'transparent'}`,
            marginBottom: -1, transition: 'all .12s',
          }}>{lbl}</button>
        ))}
      </div>
 
      {tab === 'pf'     && <PFTab     month={month} year={year} />}
      {tab === 'esi'    && <ESITab    month={month} year={year} />}
      {tab === 'pt'     && <PTTab     month={month} year={year} />}
      {tab === 'tds'    && <TDSTab    month={month} year={year} />}
      {tab === 'form16' && <Form16Tab fyYear={fyYear} setFyYear={setFyYear} empId={empId} setEmpId={setEmpId} />}
    </AppLayout>
  );
}
 
const selStyle = { height: 34, padding: '0 28px 0 10px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13.5, background: '#fff', fontFamily: 'inherit', outline: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', WebkitAppearance: 'none' as any };
 
function StatCard({ label, value, sub, color = '#1d1d1f', bg = '#f7f9fc' }: any) {
  return (
    <div style={{ background: bg, border: '1px solid #e3e3e6', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: '#6e6e73', marginTop: 5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#a1a1a6', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
 
function InfoBox({ color = '#0a84ff', bg = '#e8f1fe', children }: any) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color, lineHeight: 1.6, marginBottom: 18, display: 'flex', gap: 10 }}>
      <span>ℹ️</span><span>{children}</span>
    </div>
  );
}
 
function TableWrap({ children }: any) {
  return <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>{children}</div>;
}
 
function TH({ children, right }: any) {
  return <th style={{ padding: '10px 18px', textAlign: right ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>{children}</th>;
}
function TD({ children, right, bold, red, green, mono, muted }: any) {
  return <td style={{ padding: '12px 18px', textAlign: right ? 'right' : 'left', fontWeight: bold ? 700 : 400, color: red ? '#d83933' : green ? '#28a745' : muted ? '#a1a1a6' : '#1d1d1f', fontVariantNumeric: mono ? 'tabular-nums' : undefined }}>{children}</td>;
}
 
function EmptyState({ icon, title, sub }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, opacity: .3, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 13.5, color: '#a1a1a6', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}
 
// ── PF TAB ──────────────────────────────────────────────────────
function PFTab({ month, year }: any) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['pf-report', year, month],
    queryFn: () => api.get(`/reports/pf-esi-challan?year=${year}&month=${month}`).then(r => r.data),
  });
 
  const pfEmp   = (rows as any[]).reduce((a: number, r: any) => a + (r.pfEmployee || 0), 0);
  const pfEmlr  = (rows as any[]).reduce((a: number, r: any) => a + (r.pfEmployer || 0), 0);
  const total   = pfEmp + pfEmlr;
 
  const exportCSV = () => {
    const h = ['Emp Code', 'Name', 'UAN', 'Basic', 'PF Wage', 'EE 12%', 'ER 12%', 'Total'];
    const data = (rows as any[]).map((r: any) => [r.employeeCode, r.name, r.uan || '', r.basic, r.pfWage, r.pfEmployee, r.pfEmployer, r.pfEmployee + r.pfEmployer]);
    const csv = [h, ...data].map(row => row.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `PF-Challan-${year}-${month}.csv`; a.click();
  };
 
  return (
    <div>
      <InfoBox>
        <strong>Provident Fund (EPF)</strong> — Employee 12% + Employer 12% on basic salary, capped at ₹15,000 wage ceiling.
        Employer 12% split: EPS 8.33% (pension) + EPF 3.67%. EPFO challan due by 15th of next month.
      </InfoBox>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Employees covered" value={(rows as any[]).length} />
        <StatCard label="Employee contribution (12%)" value={`₹${pfEmp.toLocaleString()}`} bg="#fdf3e0" color="#c77700" />
        <StatCard label="Employer contribution (12%)" value={`₹${pfEmlr.toLocaleString()}`} bg="#e8f1fe" color="#0a84ff" />
        <StatCard label="Total challan amount" value={`₹${total.toLocaleString()}`} bg="#e7f6ea" color="#28a745" />
      </div>
 
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={exportCSV} style={{ padding: '7px 16px', background: '#fff', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>↓ Download ECR / Challan</button>
      </div>
 
      <TableWrap>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ borderBottom: '1px solid #e3e3e6', background: '#fafafa' }}>
            <TH>Employee</TH><TH>UAN</TH><TH right>Basic</TH><TH right>PF wage</TH><TH right>EE 12%</TH><TH right>ER 8.33% (EPS)</TH><TH right>ER 3.67% (EPF)</TH><TH right>Total</TH>
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8}><div style={{ padding: 32, textAlign: 'center', color: '#a1a1a6' }}>Loading…</div></td></tr>
            : (rows as any[]).length === 0 ? <tr><td colSpan={8}><EmptyState icon="🏦" title="No PF data" sub="Process a payrun first to see PF challan" /></td></tr>
            : (rows as any[]).map((r: any) => (
              <tr key={r.employeeCode} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f7f9fc')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <TD><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{r.employeeCode}</div></TD>
                <TD muted>{r.uan || '—'}</TD>
                <TD right mono>₹{(r.basic || 0).toLocaleString()}</TD>
                <TD right mono>₹{(r.pfWage || 0).toLocaleString()}</TD>
                <TD right mono red>₹{(r.pfEmployee || 0).toLocaleString()}</TD>
                <TD right mono>₹{Math.round((r.pfEmployer || 0) * 8.33 / 12).toLocaleString()}</TD>
                <TD right mono>₹{Math.round((r.pfEmployer || 0) * 3.67 / 12).toLocaleString()}</TD>
                <TD right mono bold>₹{((r.pfEmployee || 0) + (r.pfEmployer || 0)).toLocaleString()}</TD>
              </tr>
            ))}
            {(rows as any[]).length > 0 && (
              <tr style={{ background: '#f7f9fc', borderTop: '2px solid #e3e3e6' }}>
                <TD bold>Total</TD><TD /><TD /><TD />
                <TD right mono bold red>₹{pfEmp.toLocaleString()}</TD>
                <TD /><TD />
                <TD right mono bold>₹{total.toLocaleString()}</TD>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
 
// ── ESI TAB ─────────────────────────────────────────────────────
function ESITab({ month, year }: any) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['esi-report', year, month],
    queryFn: () => api.get(`/reports/pf-esi-challan?year=${year}&month=${month}`).then(r => r.data),
  });
 
  const esiRows = (rows as any[]).filter((r: any) => r.esiEmployee > 0 || r.esiEmployer > 0);
  const esiEmp  = esiRows.reduce((a: number, r: any) => a + (r.esiEmployee || 0), 0);
  const esiEmlr = esiRows.reduce((a: number, r: any) => a + (r.esiEmployer || 0), 0);
 
  const exportCSV = () => {
    const h = ['Emp Code', 'Name', 'ESI No', 'Gross', 'EE 0.75%', 'ER 3.25%', 'Total'];
    const csv = [h, ...esiRows.map((r: any) => [r.employeeCode, r.name, r.esiNumber || '', r.gross, r.esiEmployee, r.esiEmployer, r.esiEmployee + r.esiEmployer])].map(row => row.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `ESI-Challan-${year}-${month}.csv`; a.click();
  };
 
  return (
    <div>
      <InfoBox color="#28a745" bg="#e7f6ea">
        <strong>Employees' State Insurance (ESI)</strong> — Applicable only if gross monthly salary ≤ ₹21,000.
        Employee 0.75% + Employer 3.25% of gross. ESIC challan due by 15th of next month.
      </InfoBox>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Covered employees" value={esiRows.length} sub="Gross ≤ ₹21,000" />
        <StatCard label="Employee contribution (0.75%)" value={`₹${esiEmp.toLocaleString()}`} bg="#fdf3e0" color="#c77700" />
        <StatCard label="Employer contribution (3.25%)" value={`₹${esiEmlr.toLocaleString()}`} bg="#e8f1fe" color="#0a84ff" />
        <StatCard label="Total ESI challan" value={`₹${(esiEmp + esiEmlr).toLocaleString()}`} bg="#e7f6ea" color="#28a745" />
      </div>
 
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={exportCSV} style={{ padding: '7px 16px', background: '#fff', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>↓ Download ESI challan</button>
      </div>
 
      <TableWrap>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ borderBottom: '1px solid #e3e3e6', background: '#fafafa' }}>
            <TH>Employee</TH><TH>ESI number</TH><TH right>Gross</TH><TH right>EE 0.75%</TH><TH right>ER 3.25%</TH><TH right>Total</TH>
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6}><div style={{ padding: 32, textAlign: 'center', color: '#a1a1a6' }}>Loading…</div></td></tr>
            : esiRows.length === 0 ? <tr><td colSpan={6}><EmptyState icon="🏥" title="No ESI-applicable employees" sub="All employees earn more than ₹21,000/month gross" /></td></tr>
            : esiRows.map((r: any) => (
              <tr key={r.employeeCode} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f7f9fc')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <TD><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{r.employeeCode}</div></TD>
                <TD muted>{r.esiNumber || '—'}</TD>
                <TD right mono>₹{(r.gross || 0).toLocaleString()}</TD>
                <TD right mono red>₹{(r.esiEmployee || 0).toLocaleString()}</TD>
                <TD right mono>₹{(r.esiEmployer || 0).toLocaleString()}</TD>
                <TD right mono bold>₹{((r.esiEmployee || 0) + (r.esiEmployer || 0)).toLocaleString()}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
 
// ── PT TAB ──────────────────────────────────────────────────────
function PTTab({ month, year }: any) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['pt-report', year, month],
    queryFn: () => api.get(`/reports/salary-register?year=${year}&month=${month}&region=INDIA`).then(r => r.data),
  });
  const ptRows = (rows as any[]).filter((r: any) => r.professionalTax > 0);
  const total = ptRows.reduce((a: number, r: any) => a + (r.professionalTax || 0), 0);
 
  return (
    <div>
      <InfoBox color="#c77700" bg="#fdf3e0">
        <strong>Professional Tax (PT)</strong> — State-mandated slab-based deduction. Varies by state.
        Max ₹1,250/month (₹2,500/year). Employer liable to deduct and remit to state government.
      </InfoBox>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Employees with PT" value={ptRows.length} />
        <StatCard label="Total PT collected" value={`₹${total.toLocaleString()}`} bg="#fdf3e0" color="#c77700" />
        <StatCard label="PT slabs (Karnataka / general)" value="₹315 for ₹21K–₹45K · ₹690 for ₹45K–₹60K · ₹1,250 above" />
      </div>
      <TableWrap>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ borderBottom: '1px solid #e3e3e6', background: '#fafafa' }}>
            <TH>Employee</TH><TH right>Gross salary</TH><TH right>PT deducted</TH>
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={3}><div style={{ padding: 32, textAlign: 'center', color: '#a1a1a6' }}>Loading…</div></td></tr>
            : ptRows.length === 0 ? <tr><td colSpan={3}><EmptyState icon="📋" title="No PT data" sub="Process a payrun first" /></td></tr>
            : ptRows.map((r: any) => (
              <tr key={r.id || r.employeeCode} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f7f9fc')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <TD><div style={{ fontWeight: 600 }}>{r.employee?.firstName} {r.employee?.lastName}</div><div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{r.employee?.employeeCode}</div></TD>
                <TD right mono>₹{(r.grossSalary || 0).toLocaleString()}</TD>
                <TD right mono bold red>₹{(r.professionalTax || 0).toLocaleString()}</TD>
              </tr>
            ))}
            {ptRows.length > 0 && <tr style={{ background: '#f7f9fc', borderTop: '2px solid #e3e3e6' }}><TD bold>Total</TD><TD /><TD right mono bold red>₹{total.toLocaleString()}</TD></tr>}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
 
// ── TDS TAB ─────────────────────────────────────────────────────
function TDSTab({ month, year }: any) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tds-report', year, month],
    queryFn: () => api.get(`/reports/salary-register?year=${year}&month=${month}&region=INDIA`).then(r => r.data),
  });
  const tdsRows = (rows as any[]).filter((r: any) => (r.tdsAmount || 0) > 0);
  const totalTds = (rows as any[]).reduce((a: number, r: any) => a + (r.tdsAmount || 0), 0);
 
  return (
    <div>
      <InfoBox color="#d83933" bg="#fdecea">
        <strong>TDS on Salary (Section 192)</strong> — Deducted monthly based on estimated annual income.
        New regime (Finance Act 2026): ₹75K std deduction, full rebate if income ≤ ₹12L (Sec 156(2)).
        4% Health & Education Cess on tax. Due date: 7th of next month.
      </InfoBox>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Employees with TDS" value={tdsRows.length} />
        <StatCard label="Zero TDS (rebate)" value={(rows as any[]).length - tdsRows.length} sub="Income ≤ ₹12L" bg="#e7f6ea" color="#28a745" />
        <StatCard label="Total TDS this month" value={`₹${totalTds.toLocaleString()}`} bg="#fdecea" color="#d83933" />
        <StatCard label="Annualised TDS" value={`₹${(totalTds * 12).toLocaleString()}`} sub="Estimate" />
      </div>
      <TableWrap>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ borderBottom: '1px solid #e3e3e6', background: '#fafafa' }}>
            <TH>Employee</TH><TH>Regime</TH><TH right>Gross/month</TH><TH right>Taxable income</TH><TH right>Monthly TDS</TH><TH right>Annual TDS</TH>
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6}><div style={{ padding: 32, textAlign: 'center', color: '#a1a1a6' }}>Loading…</div></td></tr>
            : (rows as any[]).length === 0 ? <tr><td colSpan={6}><EmptyState icon="💸" title="No TDS data" sub="Process a payrun to see TDS report" /></td></tr>
            : (rows as any[]).map((r: any) => (
              <tr key={r.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f7f9fc')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <TD><div style={{ fontWeight: 600 }}>{r.employee?.firstName} {r.employee?.lastName}</div><div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{r.employee?.employeeCode}</div></TD>
                <TD><span style={{ background: '#f2f2f7', color: '#6e6e73', fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999 }}>{r.employee?.salaryStructure?.taxRegime || 'NEW'}</span></TD>
                <TD right mono>₹{(r.grossSalary || 0).toLocaleString()}</TD>
                <TD right mono>₹{(r.taxableIncome || 0).toLocaleString()}</TD>
                <TD right mono bold red>₹{(r.tdsAmount || 0).toLocaleString()}</TD>
                <TD right mono>₹{((r.tdsAmount || 0) * 12).toLocaleString()}</TD>
              </tr>
            ))}
            {(rows as any[]).length > 0 && (
              <tr style={{ background: '#f7f9fc', borderTop: '2px solid #e3e3e6' }}>
                <TD bold>Total</TD><TD /><TD /><TD />
                <TD right mono bold red>₹{totalTds.toLocaleString()}</TD>
                <TD right mono bold>₹{(totalTds * 12).toLocaleString()}</TD>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
 
// ── FORM 16 TAB ─────────────────────────────────────────────────
function Form16Tab({ fyYear, setFyYear, empId, setEmpId }: any) {
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [showDrop, setShowDrop] = useState(false);
 
  const { data: empData } = useQuery({
    queryKey: ['emp-search-f16', search],
    queryFn: () => api.get(`/employees?search=${search}&region=INDIA&limit=10`).then(r => r.data),
    enabled: search.length >= 1,
  });
  const emps = (empData as any)?.data || [];
 
  const { data: form16, isLoading: f16Load } = useQuery({
    queryKey: ['form16', selectedEmp?.id, fyYear],
    queryFn: () => api.get(`/reports/form16/${selectedEmp?.id}?year=${fyYear}`).then(r => r.data),
    enabled: !!selectedEmp,
  });
 
  return (
    <div>
      <InfoBox>
        <strong>Form 16</strong> — Certificate of TDS on salary. Part A: employer/employee details + TDS deducted.
        Part B: salary breakup + deductions. Must be issued by 15th June for the preceding financial year.
      </InfoBox>
 
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>Employee</label>
          {selectedEmp ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', border: '1px solid #0a84ff', borderRadius: 9, background: '#e8f1fe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{selectedEmp.firstName?.[0]}{selectedEmp.lastName?.[0]}</div>
                <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{selectedEmp.firstName} {selectedEmp.lastName}</div><div style={{ fontSize: 11.5, color: '#6e6e73' }}>{selectedEmp.employeeCode} · PAN: {selectedEmp.panNumber || '—'}</div></div>
              </div>
              <button onClick={() => { setSelectedEmp(null); setSearch(''); }} style={{ background: 'none', border: 'none', color: '#6e6e73', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }}
                placeholder="Search employee…" value={search} onChange={e => { setSearch(e.target.value); setShowDrop(true); }} onFocus={() => setShowDrop(true)} />
              {showDrop && search.length >= 1 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e3e3e6', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', zIndex: 50, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                  {emps.length === 0 ? <div style={{ padding: 16, textAlign: 'center', color: '#a1a1a6', fontSize: 13 }}>No employees found</div>
                  : emps.map((emp: any) => (
                    <div key={emp.id} onClick={() => { setSelectedEmp(emp); setShowDrop(false); setSearch(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f7' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f7f9fc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
                      <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div><div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{emp.employeeCode} · PAN: {emp.panNumber || '—'}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6e6e73', marginBottom: 6 }}>Financial year</label>
          <select value={fyYear} onChange={e => setFyYear(+e.target.value)} style={selStyle}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>FY {y}–{y + 1}</option>)}
          </select>
        </div>
      </div>
 
      {!selectedEmp && (
        <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, padding: '52px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, opacity: .3, marginBottom: 14 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Select an employee to generate Form 16</div>
          <div style={{ fontSize: 13.5, color: '#a1a1a6', marginTop: 5 }}>Based on all processed payslips for FY {fyYear}–{fyYear + 1}</div>
        </div>
      )}
 
      {selectedEmp && f16Load && <div style={{ padding: 48, textAlign: 'center', color: '#a1a1a6' }}>Generating Form 16…</div>}
 
      {selectedEmp && form16 && (
        <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1d1d1f, #3a3a3c)', color: '#fff', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, opacity: .6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Form 16 — Certificate u/s 203 of the Income-tax Act, 1961</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>TDS on Salary</div>
              <div style={{ fontSize: 14, opacity: .7, marginTop: 4 }}>Financial Year {fyYear}–{fyYear + 1}</div>
            </div>
            <button onClick={() => window.print()} style={{ padding: '9px 18px', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🖨 Print</button>
          </div>
 
          <div style={{ padding: '24px 28px' }}>
            {/* Part A — Employee details */}
            <div style={{ background: '#f7f9fc', borderRadius: 12, padding: 18, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 24px' }}>
              {[
                ['Employee', `${form16.employee?.name}`],
                ['PAN', form16.employee?.pan || '—'],
                ['Designation', form16.employee?.designation || '—'],
                ['Employee code', form16.employee?.employeeCode],
                ['Financial year', `FY ${fyYear}–${fyYear + 1}`],
                ['Tax regime', (form16 as any).regime || 'NEW'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
 
            {/* Part B — Income details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Income details</div>
                {[
                  ['Gross salary', form16.annualGross, false],
                  ['Standard deduction', form16.stdDeduction, true],
                  ['PF deduction (Sec 80C)', form16.annualPf, true],
                  [(form16 as any).regime === 'NEW' ? 'NPS (Sec 80CCD)' : '80C investments', (form16 as any).sec123 || 0, true],
                  [(form16 as any).regime === 'OLD' ? '80D (health insurance)' : '', (form16 as any).sec126 || 0, true],
                  ['Taxable income', form16.taxableIncome, false, true],
                ].filter(r => r[0]).map(([lbl, val, deduct, bold]: any) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f5', fontSize: 13.5 }}>
                    <span style={{ color: '#48484a', fontWeight: bold ? 700 : 400 }}>{lbl}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: bold ? 700 : 500 }}>{deduct ? '−' : ''}₹{Math.round(val).toLocaleString()}</span>
                  </div>
                ))}
              </div>
 
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Tax computation</div>
                {[
                  ['Income tax on above', form16.taxBeforeCess, false],
                  ['Health & Education Cess @4%', form16.annualCess, false],
                  ['Total tax liability', form16.annualTds, false, true],
                ].map(([lbl, val, , bold]: any) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f5', fontSize: 13.5 }}>
                    <span style={{ fontWeight: bold ? 700 : 400 }}>{lbl}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: bold ? 700 : 500 }}>₹{Math.round(val || 0).toLocaleString()}</span>
                  </div>
                ))}
 
                {/* Net pay card */}
                <div style={{ background: 'linear-gradient(135deg, #0a84ff, #0066cc)', borderRadius: 12, padding: '18px 20px', marginTop: 16, color: '#fff' }}>
                  <div style={{ fontSize: 12, opacity: .8, marginBottom: 6 }}>TOTAL TDS DEDUCTED (ACTUAL)</div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₹{Math.round(form16.annualTds || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>{form16.monthsCovered || 0} months covered · FY {fyYear}–{fyYear + 1}</div>
                </div>
              </div>
            </div>
 
            <div style={{ marginTop: 20, padding: '12px 16px', background: '#f7f9fc', borderRadius: 10, fontSize: 12, color: '#a1a1a6', textAlign: 'center' }}>
              This is a computer-generated Form 16 based on processed payslips. Verify with your payroll records before filing returns.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
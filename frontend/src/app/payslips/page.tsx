'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { payslipApi, employeesApi, api } from '@/lib/api';
import { useRegionStore } from '@/store/auth.store';
import { formatCurrency, initials } from '@/lib/utils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Live employee search picker ────────────────────────────────
function EmpPicker({ region, selected, onSelect }: { region: string; selected: any; onSelect: (e: any) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['emp-search-payslip', search, region],
    queryFn: () => employeesApi.getAll({ region, search, limit: 10 }),
    enabled: search.length >= 1,
  });
  const emps = (data as any)?.data || [];

  const pick = (e: any) => { onSelect(e); setOpen(false); setSearch(''); };
  const clear = () => { onSelect(null); setSearch(''); };

  const inp: React.CSSProperties = {
    width: '100%', height: 36, padding: '0 12px', border: '1px solid #d2d2d6',
    borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: '#fff',
  };

  return (
    <div style={{ position: 'relative', width: 300 }}>
      {selected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 10px', border: '1.5px solid #0a84ff', borderRadius: 9, background: '#e8f1fe' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
            {initials(`${selected.firstName} ${selected.lastName}`)}
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, color: '#1d1d1f' }}>{selected.firstName} {selected.lastName}</span>
          <span style={{ fontSize: 12, color: '#6e6e73' }}>{selected.employeeCode}</span>
          <button onClick={clear} style={{ background: 'none', border: 'none', color: '#6e6e73', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1a6', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
          <input
            style={{ ...inp, paddingLeft: 28 }}
            placeholder="Search employee…"
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoComplete="off"
          />
          {open && search.length >= 1 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e3e3e6', borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,.13)', zIndex: 999, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
              {emps.length === 0
                ? <div style={{ padding: '14px 16px', color: '#a1a1a6', fontSize: 13, textAlign: 'center' }}>No employees found</div>
                : emps.map((e: any) => (
                  <div key={e.id} onMouseDown={() => pick(e)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f7' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#f7f9fc')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = '')}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {initials(`${e.firstName} ${e.lastName}`)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
                      <div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{e.employeeCode} · {e.designation}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Print payslip in popup window ─────────────────────────────
function printPayslip(slip: any, org: any, cur: string, region: string, MONTHS: string[]) {
  const fmt = (v: number) => `${cur} ${(v||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  const deductions = [
    slip.pfEmployee > 0       ? ['PF (Employee 12%)',    slip.pfEmployee]      : null,
    slip.esiEmployee > 0      ? ['ESI (Employee 0.75%)', slip.esiEmployee]     : null,
    slip.professionalTax > 0  ? ['Professional Tax',     slip.professionalTax] : null,
    slip.lwfEmployee > 0      ? ['LWF',                  slip.lwfEmployee]     : null,
    slip.tdsAmount > 0        ? ['TDS (Sec 192)',         slip.tdsAmount]       : null,
    slip.gpssaEmployee > 0    ? ['GPSSA (5%)',            slip.gpssaEmployee]   : null,
    slip.loanDeduction > 0    ? ['Loan EMI',             slip.loanDeduction]   : null,
    slip.advanceDeduction > 0 ? ['Advance recovery',     slip.advanceDeduction]: null,
  ].filter(Boolean) as [string, number][];

  const earnings = region === 'UAE' ? [
    ['Basic salary',        slip.basicSalary],
    ['Housing allowance',   slip.housingAllowance],
    ['Transport allowance', slip.transportAllowance],
    ['Medical allowance',   slip.medicalAllowance],
    ['Other allowances',    slip.otherAllowances],
    slip.bonusAmount > 0    ? ['Bonus',    slip.bonusAmount]    : null,
    slip.overtimeAmount > 0 ? ['Overtime', slip.overtimeAmount] : null,
  ].filter(Boolean).filter((r: any) => r[1] > 0) as [string, number][]
  : [
    ['Basic salary',      slip.basicSalary],
    ['HRA',               slip.housingAllowance],
    ['Special allowance', slip.specialAllowance],
    slip.bonusAmount > 0  ? ['Bonus', slip.bonusAmount] : null,
  ].filter(Boolean).filter((r: any) => r[1] > 0) as [string, number][];

  const hasDeductions = (slip.totalDeductions||0) > 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Payslip — ${slip.employee?.firstName} ${slip.employee?.lastName} — ${MONTHS[(slip.month||1)-1]} ${slip.year}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1d1d1f; background: #fff; }
    .page { max-width: 680px; margin: 0 auto; padding: 40px 40px 60px; }
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #1d1d1f; margin-bottom: 24px; }
    .emp-info h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .emp-info p { font-size: 12px; color: #6e6e73; margin-top: 2px; }
    .emp-info .period { font-size: 11px; font-weight: 600; color: #0a84ff; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
    .org-info { text-align: right; }
    .org-info img { width: 64px; height: 64px; object-fit: contain; margin-bottom: 8px; display: block; margin-left: auto; }
    .org-info .org-logo-placeholder { width: 64px; height: 64px; background: #0a84ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: 800; margin-left: auto; margin-bottom: 8px; }
    .org-info .org-name { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
    .org-info .org-detail { font-size: 11px; color: #6e6e73; margin-top: 2px; }
    /* Net pay band */
    .net-pay { background: #0a84ff; color: #fff; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .net-pay .label { font-size: 11px; opacity: .8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
    .net-pay .amount { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .net-pay .status { background: rgba(255,255,255,.2); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    /* Tables */
    .section { margin-bottom: 20px; }
    .section-title { font-size: 10px; font-weight: 700; color: #a1a1a6; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e3e3e6; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f5f5f7; }
    .row:last-child { border-bottom: none; }
    .row .label { color: #48484a; }
    .row .value { font-variant-numeric: tabular-nums; font-weight: 500; }
    .row.total { border-top: 1.5px solid #1d1d1f; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 14px; }
    .row.deduct .value { color: #d83933; }
    .row.earn-total .value { color: #28a745; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e3e3e6; display: flex; justify-content: space-between; font-size: 11px; color: #a1a1a6; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="emp-info">
      <div class="period">Payslip &middot; ${MONTHS[(slip.month||1)-1]} ${slip.year}</div>
      <h1>${slip.employee?.firstName||''} ${slip.employee?.lastName||''}</h1>
      <p>${slip.employee?.employeeCode||''} &middot; ${slip.employee?.designation||''}</p>
      <p>${slip.employee?.department?.name||''}</p>
    </div>
    <div class="org-info">
      ${org?.logoUrl
        ? `<img src="${org.logoUrl}" alt="Logo"/>`
        : `<div class="org-logo-placeholder">${(org?.name||'P')[0].toUpperCase()}</div>`
      }
      <div class="org-name">${org?.name||'Organisation'}</div>
      ${org?.email   ? `<div class="org-detail">${org.email}</div>` : ''}
      ${org?.address ? `<div class="org-detail">${org.address}</div>` : ''}
      ${org?.taxId   ? `<div class="org-detail">TRN: ${org.taxId}</div>` : ''}
    </div>
  </div>

  <!-- Net pay -->
  <div class="net-pay">
    <div>
      <div class="label">Net pay</div>
      <div class="amount">${fmt(slip.netSalary)}</div>
    </div>
    <div class="status">${slip.status}</div>
  </div>

  <!-- Earnings -->
  <div class="section">
    <div class="section-title">Earnings</div>
    ${earnings.map(([l,v]) => `<div class="row"><span class="label">${l}</span><span class="value">${fmt(v)}</span></div>`).join('')}
    ${slip.lopDays > 0 ? `<div class="row deduct"><span class="label">Loss of Pay (${slip.lopDays} days)</span><span class="value">−${fmt(slip.lopDeduction)}</span></div>` : ''}
    <div class="row total earn-total"><span>Gross salary</span><span class="value">${fmt(slip.grossSalary)}</span></div>
  </div>

  ${hasDeductions ? `
  <!-- Deductions -->
  <div class="section">
    <div class="section-title">Deductions</div>
    ${deductions.map(([l,v]) => `<div class="row deduct"><span class="label">${l}</span><span class="value">−${fmt(v)}</span></div>`).join('')}
    <div class="row total deduct"><span>Total deductions</span><span class="value">−${fmt(slip.totalDeductions)}</span></div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <span>Generated by PayrollOS &middot; ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</span>
    <span>This is a computer-generated payslip and requires no signature.</span>
  </div>
</div>
<script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=780,height=900');
  if (w) { w.document.write(html); w.document.close(); }
}

export default function PayslipsPage() {
  const { region } = useRegionStore();
  const cur = region === 'UAE' ? 'AED' : 'INR';
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string|null>(null);

  // Fetch org data directly — always fresh from DB
  const { data: orgData } = useQuery({
    queryKey: ['org-for-payslip'],
    queryFn: () => api.get('/settings/organization').then(r => r.data),
    staleTime: 60000,
  });

  // Fetch full payslip with org data when selected
  const { data: fullSlip } = useQuery({
    queryKey: ['payslip-full', selectedId],
    queryFn: () => payslipApi.get(selectedId!),
    enabled: !!selectedId,
  });

  // Merge: always use live orgData so logo/name updates from settings reflect immediately
  const selectedFull = selected ? { ...(fullSlip || selected), organization: orgData } : null;

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['payslips', region, filterMonth, selectedEmp?.id],
    queryFn: () => payslipApi.list(region, filterMonth || undefined, selectedEmp?.id),
    staleTime: 0,
    retry: 2,
  });

  // payslips already filtered server-side by employeeId if selected
  const filtered = payslips as any[];

  const statusStyle: Record<string, React.CSSProperties> = {
    DRAFT:     { background: '#f2f2f7', color: '#6e6e73' },
    PROCESSED: { background: '#e8f1fe', color: '#0a84ff' },
    PAID:      { background: '#e7f6ea', color: '#28a745' },
  };

  const clearAll = () => { setSelectedEmp(null); setFilterMonth(''); };

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Payslips</h1>
          <p style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>{region} region · All payslips</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <EmpPicker region={region} selected={selectedEmp} onSelect={setSelectedEmp} />
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          style={{ height: 36, padding: '0 12px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
        />
        {(selectedEmp || filterMonth) && (
          <button onClick={clearAll} style={{ height: 36, padding: '0 14px', border: '1px solid #d2d2d6', borderRadius: 9, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: '#6e6e73' }}>
            Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#a1a1a6' }}>
          {filtered.length} payslip{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table + Detail layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 500px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e3e3e6', background: '#fafafa' }}>
                {['Employee','Period','Gross','Deductions','Net pay','Status'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: ['Gross','Deductions','Net pay'].includes(h) ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#a1a1a6' }}>
                  <div>Loading payslips…</div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 44, opacity: .25, marginBottom: 14 }}>📄</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>No payslips found</div>
                    <div style={{ fontSize: 13.5, color: '#a1a1a6', marginTop: 5 }}>
                      {selectedEmp || filterMonth ? 'Try clearing the filters' : 'Process a pay run to generate payslips'}
                    </div>
                  </div>
                </td></tr>
              ) : filtered.map((p: any) => {
                const isActive = selected?.id === p.id;
                return (
                  <tr key={p.id}
                    onClick={() => setSelected(isActive ? null : p)}
                    style={{ borderBottom: '1px solid rgba(0,0,0,.04)', cursor: 'pointer', background: isActive ? '#e8f1fe' : '', transition: 'background .1s' }}
                    onMouseEnter={e => !isActive && (e.currentTarget.style.background = '#f7f9fc')}
                    onMouseLeave={e => !isActive && (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '13px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {initials(`${p.employee?.firstName} ${p.employee?.lastName}`)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.employee?.firstName} {p.employee?.lastName}</div>
                          <div style={{ fontSize: 11.5, color: '#a1a1a6' }}>{p.employee?.employeeCode} · {p.employee?.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px', color: '#6e6e73' }}>{MONTHS[(p.month||1)-1]} {p.year}</td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatCurrency(p.grossSalary||0, cur)}</td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#d83933' }}>{formatCurrency(p.totalDeductions||0, cur)}</td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatCurrency(p.netSalary||0, cur)}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <span style={{ ...statusStyle[p.status] || statusStyle.DRAFT, fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>{p.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selectedFull && (
          <div style={{ background: '#fff', border: '1px solid #e3e3e6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.08)', position: 'sticky', top: 20 }}>

            {/* Close button row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderBottom:'1px solid #f0f0f5' }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#a1a1a6', textTransform:'uppercase', letterSpacing:'.06em' }}>Payslip · {MONTHS[(selectedFull.month||1)-1]} {selectedFull.year}</span>
              <button onClick={()=>{ setSelected(null); setSelectedId(null); }} style={{ width:24, height:24, borderRadius:'50%', border:'none', background:'#f2f2f7', cursor:'pointer', fontSize:14, color:'#6e6e73', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>

            {/* Org + Employee header — document style */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'20px 20px 16px', borderBottom:'2px solid #1d1d1f' }}>
              {/* LEFT: Employee */}
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:'#1d1d1f', marginBottom:4 }}>{selectedFull.employee?.firstName} {selectedFull.employee?.lastName}</div>
                <div style={{ fontSize:12.5, color:'#6e6e73', marginTop:2 }}>{selectedFull.employee?.employeeCode} · {selectedFull.employee?.designation}</div>
                <div style={{ fontSize:12.5, color:'#6e6e73', marginTop:2 }}>{selectedFull.employee?.department?.name}</div>
              </div>
              {/* RIGHT: Org logo + details */}
              <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                {/* Logo — large, prominent */}
                {(orgData as any)?.logoUrl ? (
                  <img src={(orgData as any).logoUrl} alt="Logo"
                    style={{ width:72, height:72, objectFit:'contain', borderRadius:8, border:'1px solid #e3e3e6', padding:4, background:'#fff', marginBottom:6 }} />
                ) : (
                  <div style={{ width:72, height:72, borderRadius:8, background:'#0a84ff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:26, fontWeight:800, marginBottom:6 }}>
                    {((orgData as any)?.name||'P')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ fontSize:13.5, fontWeight:700, color:'#1d1d1f' }}>{(orgData as any)?.name || 'Organisation'}</div>
                {(orgData as any)?.email   && <div style={{ fontSize:11.5, color:'#6e6e73' }}>{(orgData as any).email}</div>}
                {(orgData as any)?.address && <div style={{ fontSize:11.5, color:'#6e6e73', maxWidth:180, textAlign:'right', lineHeight:1.4 }}>{(orgData as any).address}</div>}
                {(orgData as any)?.taxId   && <div style={{ fontSize:11.5, color:'#6e6e73' }}>TRN: {(orgData as any).taxId}</div>}
              </div>
            </div>

            {/* Net pay band */}
            <div style={{ background:'#0a84ff', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.75)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>Net pay</div>
                <div style={{ fontSize:26, fontWeight:800, color:'#fff', fontVariantNumeric:'tabular-nums' }}>{formatCurrency(selectedFull.netSalary||0, cur)}</div>
              </div>
              <span style={{ background:'rgba(255,255,255,.2)', color:'#fff', fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:999 }}>{selectedFull.status}</span>
            </div>

            {/* Earnings */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e3e3e6' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Earnings</div>
              {region === 'UAE' ? [
                ['Basic salary',        selectedFull.basicSalary],
                ['Housing allowance',   selectedFull.housingAllowance],
                ['Transport allowance', selectedFull.transportAllowance],
                ['Medical allowance',   selectedFull.medicalAllowance],
                ['Other allowances',    selectedFull.otherAllowances],
                selectedFull.bonusAmount > 0 ? ['Bonus', selectedFull.bonusAmount] : null,
                selectedFull.overtimeAmount > 0 ? ['Overtime', selectedFull.overtimeAmount] : null,
              ].filter(Boolean).map(([l, v]: any) => v > 0 ? (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                  <span style={{ color: '#48484a' }}>{l}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatCurrency(v||0, cur)}</span>
                </div>
              ) : null) : [
                ['Basic salary',      selectedFull.basicSalary],
                ['HRA',               selectedFull.housingAllowance],
                ['Special allowance', selectedFull.specialAllowance],
                selectedFull.bonusAmount > 0 ? ['Bonus', selectedFull.bonusAmount] : null,
              ].filter(Boolean).map(([l, v]: any) => v > 0 ? (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                  <span style={{ color: '#48484a' }}>{l}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatCurrency(v||0, cur)}</span>
                </div>
              ) : null)}
              {selectedFull.lopDays > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                  <span style={{ color: '#d83933' }}>LOP ({selectedFull.lopDays} days)</span>
                  <span style={{ color: '#d83933', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(selectedFull.lopDeduction||0, cur)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 14, fontWeight: 700, borderTop: '1px solid #f0f0f5', marginTop: 6 }}>
                <span>Gross salary</span>
                <span style={{ color: '#28a745', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(selectedFull.grossSalary||0, cur)}</span>
              </div>
            </div>

            {/* Deductions — only show if there are actual deductions */}
            {(selectedFull.totalDeductions||0) > 0 && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e3e3e6' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#a1a1a6', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Deductions</div>
                {[
                  selectedFull.pfEmployee > 0        ? ['PF (Employee 12%)',     selectedFull.pfEmployee]      : null,
                  selectedFull.esiEmployee > 0       ? ['ESI (Employee 0.75%)',  selectedFull.esiEmployee]     : null,
                  selectedFull.professionalTax > 0   ? ['Professional Tax',      selectedFull.professionalTax] : null,
                  selectedFull.lwfEmployee > 0       ? ['LWF',                   selectedFull.lwfEmployee]     : null,
                  selectedFull.tdsAmount > 0         ? ['TDS (Sec 192)',          selectedFull.tdsAmount]       : null,
                  selectedFull.gpssaEmployee > 0     ? ['GPSSA (5%)',             selectedFull.gpssaEmployee]   : null,
                  selectedFull.loanDeduction > 0     ? ['Loan EMI',              selectedFull.loanDeduction]   : null,
                  selectedFull.advanceDeduction > 0  ? ['Advance recovery',      selectedFull.advanceDeduction]: null,
                ].filter(Boolean).map(([l, v]: any) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                    <span style={{ color: '#48484a' }}>{l}</span>
                    <span style={{ color: '#d83933', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(v||0, cur)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 14, fontWeight: 700, borderTop: '1px solid #f0f0f5', marginTop: 6 }}>
                  <span>Total deductions</span>
                  <span style={{ color: '#d83933', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(selectedFull.totalDeductions||0, cur)}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '14px 20px', display: 'flex', gap: 10 }}>
              <button onClick={() => printPayslip(selectedFull, orgData, cur, region, MONTHS)}
                style={{ flex: 1, padding: '9px 0', background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Print payslip
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

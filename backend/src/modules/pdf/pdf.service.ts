import { Injectable } from '@nestjs/common';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: number, cur: string) {
  return `${cur} ${Math.round(n).toLocaleString()}`;
}

@Injectable()
export class PdfService {

  // Generate full payslip HTML (print-ready, A4)
  generatePayslipHtml(slip: any, org: any): string {
    const cur   = slip.region === 'UAE' ? 'AED' : '₹';
    const month = MONTHS[(slip.payrun?.month || 1) - 1];
    const year  = slip.payrun?.year;
    const emp   = slip.employee;

    const row = (label: string, value: string, deduct = false, bold = false) =>
      `<tr>
        <td style="padding:7px 0;color:#48484a;border-bottom:1px solid #f0f0f5;font-size:13px">${label}</td>
        <td style="padding:7px 0;text-align:right;border-bottom:1px solid #f0f0f5;font-size:13px;font-weight:${bold?700:400};color:${deduct?'#d83933':'#1d1d1f'};font-variant-numeric:tabular-nums">
          ${deduct && +value > 0 ? '−' : ''}${value}
        </td>
      </tr>`;

    const earningsRows = [
      slip.region === 'UAE' ? [
        ['Basic salary',        fmt(slip.basicSalary||0, cur)],
        ['Housing allowance',   fmt(slip.housingAllowance||0, cur)],
        ['Transport allowance', fmt(slip.transportAllowance||0, cur)],
        ['Medical allowance',   fmt(slip.medicalAllowance||0, cur)],
        slip.otherAllowances > 0 ? ['Other allowances', fmt(slip.otherAllowances||0, cur)] : null,
        slip.bonusAmount > 0     ? ['Bonus',            fmt(slip.bonusAmount||0, cur)]    : null,
        slip.overtimeAmount > 0  ? ['Overtime',         fmt(slip.overtimeAmount||0, cur)] : null,
        slip.reimbursementAmount > 0 ? ['Reimbursements', fmt(slip.reimbursementAmount||0, cur)] : null,
        slip.lopDays > 0 ? [`LOP (${slip.lopDays} days)`, `-${fmt(slip.lopDeduction||0, cur)}`] : null,
      ] : [
        ['Basic salary',       fmt(slip.basicSalary||0, cur)],
        ['HRA',                fmt(slip.hraAmount||0, cur)],
        ['Special allowance',  fmt(slip.specialAllowance||0, cur)],
        slip.bonusAmount > 0  ? ['Bonus',           fmt(slip.bonusAmount||0, cur)]  : null,
        slip.reimbursementAmount > 0 ? ['Reimbursements', fmt(slip.reimbursementAmount||0, cur)] : null,
        slip.lopDays > 0 ? [`LOP (${slip.lopDays} days)`, `-${fmt(slip.lopDeduction||0, cur)}`] : null,
      ]
    ].flat().filter(Boolean) as [string,string][];

    const deductionRows = slip.region === 'UAE' ? [
      slip.gpssaEmployee > 0  ? ['GPSSA (Employee 5%)', fmt(slip.gpssaEmployee||0, cur)] : null,
      slip.loanDeduction > 0  ? ['Loan EMI',            fmt(slip.loanDeduction||0, cur)]  : null,
      slip.advanceDeduction > 0 ? ['Advance recovery',  fmt(slip.advanceDeduction||0, cur)] : null,
    ].filter(Boolean) as [string,string][] : [
      slip.pfEmployee > 0     ? ['PF (Employee 12%)',  fmt(slip.pfEmployee||0, cur)]    : null,
      slip.esiEmployee > 0    ? ['ESI (Employee 0.75%)', fmt(slip.esiEmployee||0, cur)] : null,
      slip.professionalTax > 0 ? ['Professional Tax', fmt(slip.professionalTax||0, cur)] : null,
      slip.lwfEmployee > 0    ? ['LWF',               fmt(slip.lwfEmployee||0, cur)]    : null,
      slip.tdsAmount > 0      ? ['TDS (Section 192)', fmt(slip.tdsAmount||0, cur)]      : null,
      slip.loanDeduction > 0  ? ['Loan EMI',          fmt(slip.loanDeduction||0, cur)]  : null,
      slip.advanceDeduction > 0 ? ['Advance recovery', fmt(slip.advanceDeduction||0, cur)] : null,
    ].filter(Boolean) as [string,string][];

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Payslip - ${emp?.firstName} ${emp?.lastName} - ${month} ${year}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; background: #f4f4f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 794px; min-height: 1123px; margin: 0 auto; background: #fff; padding: 48px; }
  table { width: 100%; border-collapse: collapse; }
  @media print {
    body { background: #fff; }
    .page { width: 100%; padding: 32px; box-shadow: none; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Print button -->
  <div class="no-print" style="text-align:right;margin-bottom:20px">
    <button onclick="window.print()" style="padding:9px 20px;background:#0a84ff;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">🖨 Print / Save PDF</button>
  </div>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #0a84ff">
    <div>
      <div style="font-size:24px;font-weight:800;color:#1d1d1f;letter-spacing:-.02em">${org?.name || 'Company'}</div>
      <div style="font-size:13px;color:#6e6e73;margin-top:4px">Payslip for ${month} ${year}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;font-weight:600;color:#6e6e73">PAYSLIP</div>
      <div style="font-size:12px;color:#a1a1a6;margin-top:4px">${slip.region} · ${cur}</div>
    </div>
  </div>

  <!-- Employee info -->
  <div style="background:#f7f9fc;border-radius:12px;padding:20px;margin-bottom:28px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px 28px">
    ${[
      ['Employee name',  `${emp?.firstName} ${emp?.lastName}`],
      ['Employee ID',    emp?.employeeCode || '—'],
      ['Designation',    emp?.designation || '—'],
      ['Department',     emp?.department?.name || '—'],
      ['Pay period',     `${month} ${year}`],
      ['Working days',   `${slip.workingDays || 22}`],
    ].map(([k,v]) => `
      <div>
        <div style="font-size:11px;font-weight:600;color:#a1a1a6;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${k}</div>
        <div style="font-size:13.5px;font-weight:500;color:#1d1d1f">${v}</div>
      </div>`).join('')}
  </div>

  <!-- Earnings + Deductions -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:24px">
    <div>
      <div style="font-size:12px;font-weight:700;color:#a1a1a6;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Earnings</div>
      <table>
        <tbody>
          ${earningsRows.map(([l,v]) => row(l, v)).join('')}
          <tr>
            <td style="padding:10px 0;font-weight:700;font-size:14px">Gross salary</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;font-size:14px;color:#28a745;font-variant-numeric:tabular-nums">${fmt(slip.grossSalary||0, cur)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;color:#a1a1a6;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Deductions</div>
      <table>
        <tbody>
          ${deductionRows.length > 0
            ? deductionRows.map(([l,v]) => row(l, v, true)).join('')
            : '<tr><td colspan="2" style="padding:12px 0;color:#a1a1a6;font-size:13px">No deductions this month</td></tr>'}
          <tr>
            <td style="padding:10px 0;font-weight:700;font-size:14px">Total deductions</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;font-size:14px;color:#d83933;font-variant-numeric:tabular-nums">${fmt(slip.totalDeductions||0, cur)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Net pay -->
  <div style="background:linear-gradient(135deg,#0a84ff,#0055cc);border-radius:14px;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;color:#fff;margin-bottom:24px">
    <div>
      <div style="font-size:12px;opacity:.8;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Net pay</div>
      <div style="font-size:36px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums">${fmt(slip.netSalary||0, cur)}</div>
    </div>
    <div style="text-align:right;font-size:13px;opacity:.8;line-height:2">
      ${slip.region === 'INDIA' ? `
        <div>PF (Employer): ${fmt(slip.pfEmployer||0, cur)}</div>
        <div>ESI (Employer): ${fmt(slip.esiEmployer||0, cur)}</div>
      ` : slip.gpssaEmployer > 0 ? `
        <div>GPSSA (Employer): ${fmt(slip.gpssaEmployer||0, cur)}</div>
        <div>Gratuity accrual: ${fmt(slip.gratuityAccrual||0, cur)}</div>
      ` : `<div>Gratuity accrual: ${fmt(slip.gratuityAccrual||0, cur)}</div>`}
      <div>Status: ${slip.status || 'PROCESSED'}</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #e3e3e6;padding-top:16px;text-align:center;color:#a1a1a6;font-size:11.5px">
    This is a computer-generated payslip and does not require a physical signature. &nbsp;|&nbsp; Generated on ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
  </div>
</div>
</body>
</html>`;
  }

  // Generate PF ECR format for EPFO UAN portal
  generateECR(rows: any[], month: number, year: number): string {
    const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    // ECR v2.0 format
    const header = `#~#${String(month).padStart(2,'0')}#~#${year}#~#${rows.length}#~#${rows.reduce((a: number, r: any) => a + (r.pfEmployee||0) + (r.pfEmployer||0), 0).toFixed(2)}`;
    const lines = rows.map((r: any) => [
      r.uan || '',                                     // UAN
      r.name || '',                                    // Member name
      (r.basic || 0).toFixed(2),                      // Gross wages
      (r.pfWage || 0).toFixed(2),                     // EPF wages
      (r.pfWage || 0).toFixed(2),                     // EPS wages
      (r.pfWage || 0).toFixed(2),                     // EDLI wages
      (r.pfEmployee || 0).toFixed(2),                 // EE share (12%)
      (Math.round((r.pfEmployer||0)*8.33/12*100)/100).toFixed(2), // ER EPS (8.33%)
      (Math.round((r.pfEmployer||0)*3.67/12*100)/100).toFixed(2), // ER EPF (3.67%)
      '0.00',                                          // NCP days
      '0.00',                                          // Refund advance
    ].join('#~#'));
    return [header, ...lines].join('\n');
  }

  // Generate India Form 24Q XML (simplified TDS return format)
  generateForm24Q(payslips: any[], orgId: string, quarter: number, year: number): string {
    const total = payslips.reduce((a: number, p: any) => a + (p.tdsAmount || 0), 0);
    return `<?xml version="1.0" encoding="UTF-8"?>
<TDS_24Q>
  <Header>
    <Quarter>${quarter}</Quarter>
    <FinancialYear>${year}-${year+1}</FinancialYear>
    <OrganizationId>${orgId}</OrganizationId>
    <TotalTDS>${total.toFixed(2)}</TotalTDS>
    <EmployeeCount>${payslips.length}</EmployeeCount>
    <GeneratedOn>${new Date().toISOString()}</GeneratedOn>
  </Header>
  <Deductees>
${payslips.map((p: any) => `    <Deductee>
      <PAN>${p.employee?.panNumber || 'PANNOTAVBL'}</PAN>
      <Name>${p.employee?.firstName} ${p.employee?.lastName}</Name>
      <AmountPaid>${(p.grossSalary||0).toFixed(2)}</AmountPaid>
      <TaxDeducted>${(p.tdsAmount||0).toFixed(2)}</TaxDeducted>
      <Month>${p.month}</Month>
    </Deductee>`).join('\n')}
  </Deductees>
</TDS_24Q>`;
  }

  // Generate India NEFT/bank transfer file (generic CSV format)
  generateBankTransferCSV(payslips: any[], bankName: string): string {
    const headers = ['Account Number', 'IFSC Code', 'Beneficiary Name', 'Amount', 'Remarks'];
    const rows = payslips.map((p: any) => [
      p.employee?.bankAccount || '',
      p.employee?.ifscCode    || '',
      `${p.employee?.firstName} ${p.employee?.lastName}`,
      p.netSalary.toFixed(2),
      `Salary ${p.payrun?.month}/${p.payrun?.year}`,
    ]);
    return [headers, ...rows].map(r => r.join(',')).join('\n');
  }

  // Generate UAE ESIC Return (Form 6 equivalent for India)
  generateESICReturn(rows: any[], month: number, year: number): string {
    const headers = ['IP Number','Name','IFSC','Branch Code','Gross Wages','ESI Employee 0.75%','ESI Employer 3.25%','Total'];
    const data = rows.map((r: any) => [
      r.esiNumber || '',
      r.name,
      '',
      '',
      (r.gross||0).toFixed(2),
      (r.esiEmployee||0).toFixed(2),
      (r.esiEmployer||0).toFixed(2),
      ((r.esiEmployee||0)+(r.esiEmployer||0)).toFixed(2),
    ]);
    return [headers, ...data].map(r => r.join(',')).join('\n');
  }
}

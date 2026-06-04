/**
 * PayrollOS — Core Tax Engine
 *
 * UAE:   No income tax. WPS mandatory. Gratuity per Labour Law Art.51.
 *        GPSSA for UAE nationals (Employer 12.5% + Employee 5%).
 *
 * India: Finance Act 2026 / Income-Tax Act 2025
 *        New Regime (default): Sec 202 slabs, ₹75k std deduction, ₹12L rebate (Sec 156(2))
 *        Old Regime (opt-in):  Sec 123/80C ₹1.5L, Sec 126/80D ₹25k-50k, HRA, ₹50k std deduction
 *        PF:  Employee 12% + Employer 12% (8.33% EPS + 3.67% EPF), ceiling ₹15,000 basic
 *        ESI: Employee 0.75% + Employer 3.25%, applicable gross ≤ ₹21,000
 *        PT:  State-wise slabs (from uploaded PF_ESI_PT doc)
 *        LWF: State-specific (Tamil Nadu: Emp ₹14 + Emplr ₹28, half-yearly)
 *        Gratuity: Payment of Gratuity Act — 15/26 × basic × years (after 5 yrs)
 */
 
export interface UAEInput {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  medicalAllowance: number;
  workingDays: number;
  daysWorked: number;
  yearsOfService: number;
  isUaeNational: boolean;
  loanEmi: number;
  advanceDeduction: number;
  overtimeAmount: number;
  bonusAmount: number;
}
 
export interface IndiaInput {
  ctcAnnual: number;
  basicPct: number;
  hraPct: number;
  cityType: 'METRO' | 'NON_METRO';
  actualRentMonthly: number;
  workingDays: number;
  daysWorked: number;
  pfEnabled: boolean;
  pfOptOut: boolean;
  esiEnabled: boolean;
  ptEnabled: boolean;
  lwfEnabled: boolean;
  lwfState: string;
  taxRegime: 'NEW' | 'OLD';
  sec123Investment: number;
  sec126Premium: number;
  homeLoanInterest: number;
  npsEmployee: number;
  yearsOfService: number;
  loanEmi: number;
  advanceDeduction: number;
  overtimeAmount: number;
  bonusAmount: number;
  payMonth: number;
}
 
export interface PayslipCalcResult {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  specialAllowance: number;
  overtimeAmount: number;
  bonusAmount: number;
  grossSalary: number;
  lopDays: number;
  lopDeduction: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  lwfEmployee: number;
  lwfEmployer: number;
  tdsAmount: number;
  loanDeduction: number;
  advanceDeduction: number;
  totalDeductions: number;
  netSalary: number;
  gratuityAccrual: number;
  gpssaEmployee: number;
  gpssaEmployer: number;
  taxableIncome?: number;
  hraExemption?: number;
  surcharge?: number;
  cess?: number;
}
 
// ═══════════════════════════════════════════════════════════════
// UAE PAYROLL ENGINE
// ═══════════════════════════════════════════════════════════════
export function calcUAE(input: UAEInput): PayslipCalcResult {
  const {
    basicSalary, housingAllowance, transportAllowance,
    otherAllowances, medicalAllowance,
    workingDays, daysWorked, yearsOfService, isUaeNational,
    loanEmi, advanceDeduction, overtimeAmount, bonusAmount,
  } = input;
 
  const fullGross = basicSalary + housingAllowance + transportAllowance + otherAllowances + medicalAllowance;
  const dailyRate  = workingDays > 0 ? fullGross / workingDays : 0;
  const lopDays    = Math.max(0, workingDays - daysWorked);
  const lopDeduction = r2(dailyRate * lopDays);
  const grossSalary  = r2(fullGross - lopDeduction + overtimeAmount + bonusAmount);
 
  // GPSSA — UAE nationals only
  const gpssaEmployee = isUaeNational ? r2(basicSalary * 0.05)   : 0;
  const gpssaEmployer = isUaeNational ? r2(basicSalary * 0.125)  : 0;
 
  const totalDeductions = r2(loanEmi + advanceDeduction + lopDeduction + gpssaEmployee);
  const netSalary       = r2(grossSalary - loanEmi - advanceDeduction - gpssaEmployee);
 
  // Gratuity — UAE Labour Law Article 51
  // Yrs 1-5: 21 calendar days basic/year; Yrs 6+: 30 days/year
  let gratuityAccrual = 0;
  if (yearsOfService >= 1) {
    const dailyBasic = (basicSalary * 12) / 365;
    gratuityAccrual  = yearsOfService <= 5
      ? r2(dailyBasic * 21 * yearsOfService)
      : r2(dailyBasic * (21 * 5 + 30 * (yearsOfService - 5)));
  }
 
  return {
    basicSalary, housingAllowance, transportAllowance,
    medicalAllowance, otherAllowances, specialAllowance: 0,
    overtimeAmount, bonusAmount, grossSalary,
    lopDays, lopDeduction,
    pfEmployee: 0, pfEmployer: 0,
    esiEmployee: 0, esiEmployer: 0,
    professionalTax: 0, lwfEmployee: 0, lwfEmployer: 0, tdsAmount: 0,
    loanDeduction: loanEmi, advanceDeduction, totalDeductions, netSalary,
    gratuityAccrual, gpssaEmployee, gpssaEmployer,
  };
}
 
// ═══════════════════════════════════════════════════════════════
// INDIA PAYROLL ENGINE — Finance Act 2026 / ITA 2025
// ═══════════════════════════════════════════════════════════════
export function calcIndia(input: IndiaInput): PayslipCalcResult {
  const {
    ctcAnnual, basicPct, hraPct, cityType, actualRentMonthly,
    workingDays, daysWorked, pfEnabled, pfOptOut, esiEnabled,
    ptEnabled, lwfEnabled, lwfState, taxRegime,
    sec123Investment, sec126Premium, homeLoanInterest, npsEmployee,
    yearsOfService, loanEmi, advanceDeduction, overtimeAmount, bonusAmount, payMonth,
  } = input;
 
  // ── Salary split from CTC ──────────────────────────────────
  const basicAnnual    = r2(ctcAnnual * basicPct / 100);
  const basicMonthly   = r2(basicAnnual / 12);
  const hraAnnual      = r2(basicAnnual * hraPct / 100);
  const hraMonthly     = r2(hraAnnual / 12);
 
  // ── PF (ITA 2025 / EPFO rules) ────────────────────────────
  // Employee 12% + Employer 12% (8.33% EPS + 3.67% EPF) on basic+DA
  // Wage ceiling ₹15,000; opt-out allowed if basic > ceiling
  const PF_CEILING = 15000;
  const pfWage     = Math.min(basicMonthly, PF_CEILING);
  const pfActive   = pfEnabled && !pfOptOut;
  const pfEmployee = pfActive ? r2(pfWage * 0.12) : 0;
  const pfEmployer = pfActive ? r2(pfWage * 0.12) : 0; // full 12% employer share
 
  // ── Special allowance (CTC remainder) ─────────────────────
  // Calculated first; ESI is checked against actual gross below
  const specialAnnual_pre  = Math.max(0, ctcAnnual - basicAnnual - hraAnnual - pfEmployee*12 - pfEmployer*12);
  const specialMonthly_pre = r2(specialAnnual_pre / 12);
  const grossMonthly_pre   = r2(basicMonthly + hraMonthly + specialMonthly_pre);
 
  // ── ESI — Employee 0.75%, Employer 3.25%, gross ≤ ₹21,000 ─
  const ESI_CEILING   = 21000;
  const esiApplicable = esiEnabled && grossMonthly_pre <= ESI_CEILING;
  const esiEmployee   = esiApplicable ? r2(grossMonthly_pre * 0.0075) : 0;
  const esiEmployer   = esiApplicable ? r2(grossMonthly_pre * 0.0325) : 0;
 
  // ── Final special allowance net of ESI ────────────────────
  let specialAnnual = Math.max(0, ctcAnnual - basicAnnual - hraAnnual
    - (pfEmployee * 12) - (pfEmployer * 12)
    - (esiEmployee * 12) - (esiEmployer * 12));
  const specialMonthly = r2(specialAnnual / 12);
  const grossMonthly   = r2(basicMonthly + hraMonthly + specialMonthly);
 
  // ── LOP ────────────────────────────────────────────────────
  const dailyRate   = workingDays > 0 ? grossMonthly / workingDays : 0;
  const lopDays     = Math.max(0, workingDays - daysWorked);
  const lopDeduction = r2(dailyRate * lopDays);
  const grossSalary  = r2(grossMonthly - lopDeduction + overtimeAmount + bonusAmount);
 
  // ── Professional Tax (state slab — from uploaded doc) ─────
  const professionalTax = ptEnabled ? getPT(grossMonthly) : 0;
 
  // ── LWF (state-specific, from uploaded doc) ───────────────
  const lwf       = lwfEnabled ? getLWF(lwfState, payMonth) : { employee: 0, employer: 0 };
  const lwfEmployee = lwf.employee;
  const lwfEmployer = lwf.employer;
 
  // ── HRA Exemption (old regime only) ───────────────────────
  let hraExemption = 0;
  if (taxRegime === 'OLD') {
    const rentAnnual    = actualRentMonthly * 12;
    const excessRent    = Math.max(0, rentAnnual - 0.1 * basicAnnual);
    const cityPct       = cityType === 'METRO' ? 0.5 : 0.4;
    hraExemption        = r2(Math.min(hraAnnual, cityPct * basicAnnual, excessRent));
  }
 
  // ── TDS — Finance Act 2026 ────────────────────────────────
  const tdsResult = calcTDS({
    ctcAnnual, pfAnnual: pfEmployee * 12,
    hraExemption, taxRegime,
    sec123: Math.min(sec123Investment || 0, 150000),
    sec126: Math.min(sec126Premium    || 0,  50000),
    sec22:  Math.min(homeLoanInterest  || 0, 200000),
    npsAnnual: (npsEmployee || 0) * 12,
    bonusAnnual: bonusAmount * 12,
  });
 
  // ── Gratuity — Payment of Gratuity Act ────────────────────
  // Eligible after 5 years: 15/26 × basic × years
  const gratuityAccrual = yearsOfService >= 5
    ? r2((basicMonthly / 26) * 15 * yearsOfService) : 0;
 
  const totalDeductions = r2(
    pfEmployee + esiEmployee + professionalTax + lwfEmployee
    + tdsResult.monthly + loanEmi + advanceDeduction + lopDeduction
  );
  const netSalary = r2(Math.max(0, grossSalary - pfEmployee - esiEmployee
    - professionalTax - lwfEmployee - tdsResult.monthly - loanEmi - advanceDeduction));
 
  return {
    basicSalary: basicMonthly,
    housingAllowance: hraMonthly,
    transportAllowance: 0,
    medicalAllowance: 0,
    otherAllowances: 0,
    specialAllowance: specialMonthly,
    overtimeAmount, bonusAmount, grossSalary,
    lopDays, lopDeduction,
    pfEmployee, pfEmployer, esiEmployee, esiEmployer,
    professionalTax, lwfEmployee, lwfEmployer,
    tdsAmount: tdsResult.monthly,
    loanDeduction: loanEmi, advanceDeduction,
    totalDeductions, netSalary,
    gratuityAccrual,
    gpssaEmployee: 0, gpssaEmployer: 0,
    taxableIncome: tdsResult.taxableIncome,
    hraExemption,
    surcharge: tdsResult.surcharge,
    cess: tdsResult.cess,
  };
}
 
// ── TDS computation ───────────────────────────────────────────
function calcTDS(p: {
  ctcAnnual: number; pfAnnual: number; hraExemption: number;
  taxRegime: 'NEW' | 'OLD'; sec123: number; sec126: number;
  sec22: number; npsAnnual: number; bonusAnnual: number;
}) {
  let taxableIncome = 0;
 
  if (p.taxRegime === 'NEW') {
    // ITA 2025 Sec 202 — New Regime
    // Std deduction ₹75,000; NPS (Sec 124(3)) ₹50,000 additional
    const stdDed  = Math.min(75000, p.ctcAnnual);
    const npsDed  = Math.min(p.npsAnnual, 50000);
    taxableIncome = Math.max(0, p.ctcAnnual - p.pfAnnual - stdDed - npsDed);
    // Sec 156(2) full rebate if income ≤ ₹12,00,000
    if (taxableIncome <= 1200000) {
      return { monthly: 0, taxableIncome, surcharge: 0, cess: 0 };
    }
  } else {
    // Old Regime — Std deduction ₹50,000
    const stdDed  = Math.min(50000, p.ctcAnnual);
    taxableIncome = Math.max(0,
      p.ctcAnnual - p.pfAnnual - stdDed - p.hraExemption
      - p.sec123 - p.sec126 - p.sec22 - p.npsAnnual
    );
    // Old regime rebate if ≤ ₹5L
    if (taxableIncome <= 500000) {
      return { monthly: 0, taxableIncome, surcharge: 0, cess: 0 };
    }
  }
 
  let tax = slabTax(taxableIncome, p.taxRegime);
 
  // Surcharge
  let surcharge = 0;
  if      (taxableIncome > 50000000) surcharge = tax * 0.37;
  else if (taxableIncome > 20000000) surcharge = tax * 0.25;
  else if (taxableIncome > 10000000) surcharge = tax * 0.15;
  else if (taxableIncome > 5000000)  surcharge = tax * 0.10;
  surcharge = r2(surcharge);
 
  // Health & Education Cess 4%
  const cess    = r2((tax + surcharge) * 0.04);
  const annual  = r2(tax + surcharge + cess);
  const monthly = r2(annual / 12);
 
  return { monthly, taxableIncome, surcharge, cess };
}
 
function slabTax(income: number, regime: 'NEW' | 'OLD'): number {
  if (regime === 'NEW') {
    // Finance Act 2026 / ITA 2025 — Sec 202
    let t = 0;
    if      (income <= 400000)  t = 0;
    else if (income <= 800000)  t = (income - 400000)  * 0.05;
    else if (income <= 1200000) t = 20000  + (income - 800000)  * 0.10;
    else if (income <= 1600000) t = 60000  + (income - 1200000) * 0.15;
    else if (income <= 2000000) t = 120000 + (income - 1600000) * 0.20;
    else if (income <= 2400000) t = 200000 + (income - 2000000) * 0.25;
    else                        t = 300000 + (income - 2400000) * 0.30;
    return r2(t);
  }
  // Old regime
  let t = 0;
  if      (income <= 250000)  t = 0;
  else if (income <= 500000)  t = (income - 250000)  * 0.05;
  else if (income <= 1000000) t = 12500  + (income - 500000)  * 0.20;
  else                        t = 112500 + (income - 1000000) * 0.30;
  return r2(t);
}
 
// ── PT slabs — from uploaded PF_ESI_PT_and_LWF_Summary_V1.docx ──
export function getPT(grossMonthly: number): number {
  if (grossMonthly <= 21000)  return 0;
  if (grossMonthly <= 30000)  return 135;
  if (grossMonthly <= 45000)  return 315;
  if (grossMonthly <= 60000)  return 690;
  if (grossMonthly <= 75000)  return 1025;
  return 1250;
}
 
// ── LWF rates (state-specific, from uploaded doc) ────────────
// Tamil Nadu: Employee ₹14 + Employer ₹28 (half-yearly: June & Dec)
export function getLWF(state: string, month: number): { employee: number; employer: number } {
  const halfYearlyMonths = [6, 12];
  const isHalf = halfYearlyMonths.includes(month);
 
  const rates: Record<string, { emp: number; emplr: number; freq: 'MONTHLY' | 'HALF_YEARLY' | 'ANNUAL' }> = {
    TAMIL_NADU:    { emp: 14,   emplr: 28,  freq: 'HALF_YEARLY' },
    MAHARASHTRA:   { emp: 6,    emplr: 12,  freq: 'HALF_YEARLY' },
    KARNATAKA:     { emp: 20,   emplr: 40,  freq: 'ANNUAL'      },
    ANDHRA_PRADESH:{ emp: 30,   emplr: 70,  freq: 'HALF_YEARLY' },
    TELANGANA:     { emp: 30,   emplr: 70,  freq: 'HALF_YEARLY' },
    GUJARAT:       { emp: 6,    emplr: 12,  freq: 'HALF_YEARLY' },
    MADHYA_PRADESH:{ emp: 10,   emplr: 20,  freq: 'MONTHLY'     },
    KERALA:        { emp: 20,   emplr: 40,  freq: 'HALF_YEARLY' },
    HARYANA:       { emp: 31.5, emplr: 63,  freq: 'MONTHLY'     },
    PUNJAB:        { emp: 10,   emplr: 20,  freq: 'MONTHLY'     },
    WEST_BENGAL:   { emp: 3,    emplr: 15,  freq: 'MONTHLY'     },
    ODISHA:        { emp: 20,   emplr: 40,  freq: 'HALF_YEARLY' },
    CHHATTISGARH:  { emp: 10,   emplr: 25,  freq: 'MONTHLY'     },
  };
 
  const r = rates[state];
  if (!r) return { employee: 0, employer: 0 };
  if (r.freq === 'MONTHLY')     return { employee: r.emp, employer: r.emplr };
  if (r.freq === 'HALF_YEARLY') return isHalf ? { employee: r.emp, employer: r.emplr } : { employee: 0, employer: 0 };
  if (r.freq === 'ANNUAL')      return month === 12 ? { employee: r.emp, employer: r.emplr } : { employee: 0, employer: 0 };
  return { employee: 0, employer: 0 };
}
 
// ── UAE Gratuity standalone ───────────────────────────────────
export function uaeGratuity(basicMonthly: number, years: number): number {
  if (years < 1) return 0;
  const dailyBasic = (basicMonthly * 12) / 365;
  return years <= 5
    ? r2(dailyBasic * 21 * years)
    : r2(dailyBasic * (21 * 5 + 30 * (years - 5)));
}
 
// ── India Gratuity — Payment of Gratuity Act ─────────────────
export function indiaGratuity(basicMonthly: number, years: number): number {
  if (years < 5) return 0;
  return r2((basicMonthly / 26) * 15 * years);
}
 
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
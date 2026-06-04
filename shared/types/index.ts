// ================================================================
// PAYROLLOS — SHARED TYPES (frontend + backend)
// ================================================================

export type Region   = 'UAE' | 'INDIA';
export type Currency = 'AED' | 'INR';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
export type EmployeeStatus   = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type Gender           = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus    = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type PayrunStatus     = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PROCESSED' | 'PAID';
export type LeaveType        = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'EMERGENCY' | 'COMPASSIONATE';
export type LeaveStatus      = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LoanStatus       = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'CLOSED' | 'REJECTED';
export type AdvanceStatus    = 'PENDING' | 'APPROVED' | 'DEDUCTED' | 'REJECTED';
export type TaxRegime        = 'NEW' | 'OLD';
export type CityType         = 'METRO' | 'NON_METRO';
export type PayslipStatus    = 'DRAFT' | 'FINAL';

// ── Auth ─────────────────────────────────────────────────────
export interface LoginRequest  { email: string; password: string; orgSlug: string; }
export interface AuthTokens    { accessToken: string; refreshToken: string; }
export interface AuthResponse  { accessToken: string; refreshToken: string; user: UserProfile; }
export interface UserProfile {
  id: string; email: string; name: string; role: UserRole;
  organizationId: string; organizationName: string;
  region: Region; photoUrl?: string;
}

// ── Organization ─────────────────────────────────────────────
export interface Organization {
  id: string; name: string; slug: string; region: Region; currency: Currency;
  logo?: string; address: string; email: string; phone: string;
  taxId?: string; wpsRoutingCode?: string; bankName?: string;
  bankAccount?: string; bankIfsc?: string;
  pfNumber?: string; esiNumber?: string; ptNumber?: string;
  lwfEnabled: boolean; isActive: boolean;
  createdAt: string; updatedAt: string;
}

// ── Department ───────────────────────────────────────────────
export interface Department { id: string; name: string; organizationId: string; managerId?: string; }

// ── Employee ─────────────────────────────────────────────────
export interface Employee {
  id: string; empCode: string; firstName: string; lastName: string;
  email: string; phone?: string; photoUrl?: string;
  dob?: string; gender?: Gender; maritalStatus?: MaritalStatus;
  nationality?: string; dateOfJoining: string;
  designation: string; departmentId: string; department?: Department;
  managerId?: string; status: EmployeeStatus;
  organizationId: string; region: Region;
  // UAE
  emiratesId?: string; visaNumber?: string; visaExpiry?: string;
  passportNumber?: string; passportExpiry?: string;
  labourCard?: string; workPermit?: string; isUaeNational?: boolean;
  // India
  panNumber?: string; aadharNumber?: string; pfUan?: string; esiNumber?: string;
  createdAt: string; updatedAt: string;
}

// ── Salary Structure ─────────────────────────────────────────
export interface SalaryStructure {
  id: string; employeeId: string; effectiveFrom: string; region: Region;
  // UAE
  basicSalary?: number; housingAllowance?: number; transportAllowance?: number;
  otherAllowances?: number; medicalAllowance?: number;
  // India
  ctcAnnual?: number; basicPct?: number; hraPct?: number;
  cityType?: CityType; actualRentMonthly?: number; taxRegime?: TaxRegime;
  // Statutory flags
  pfEnabled: boolean; pfOptOut: boolean; esiEnabled: boolean;
  ptEnabled: boolean; lwfEnabled: boolean; npsEmployee?: number;
  // Old regime investments
  sec123Investment?: number; sec126Premium?: number;
  homeLoanInterest?: number; otherDeductions?: number;
  isActive: boolean; createdAt: string;
}

// ── Payrun ───────────────────────────────────────────────────
export interface Payrun {
  id: string; organizationId: string; month: number; year: number;
  region: Region; status: PayrunStatus;
  totalGross: number; totalDeductions: number; totalNet: number;
  totalEmployerCost: number; employeeCount: number;
  processedAt?: string; approvedBy?: string; notes?: string;
  createdAt: string; updatedAt: string;
  payslips?: Payslip[];
}

// ── Payslip ──────────────────────────────────────────────────
export interface Payslip {
  id: string; payrunId: string; employeeId: string; employee?: Employee;
  month: number; year: number; region: Region;
  workingDays: number; daysWorked: number; lopDays: number; lopDeduction: number;
  // Earnings
  basicSalary: number; housingAllowance: number; transportAllowance: number;
  medicalAllowance: number; otherAllowances: number; specialAllowance: number;
  overtimeAmount: number; bonusAmount: number; grossSalary: number;
  // Employee deductions
  pfEmployee: number; esiEmployee: number; professionalTax: number;
  lwfEmployee: number; tdsAmount: number;
  loanDeduction: number; advanceDeduction: number; totalDeductions: number;
  netSalary: number;
  // Employer contributions (not from employee)
  pfEmployer: number; esiEmployer: number; lwfEmployer: number;
  gratuityAccrual: number; gpssaEmployee: number; gpssaEmployer: number;
  // Tax workings
  taxableIncome?: number; taxRegime?: TaxRegime;
  hraExemption?: number; surcharge?: number; cess?: number;
  status: PayslipStatus; pdfUrl?: string;
  createdAt: string; updatedAt: string;
}

// ── Leave ────────────────────────────────────────────────────
export interface LeaveBalance { id: string; employeeId: string; type: LeaveType; year: number; entitled: number; taken: number; remaining: number; }
export interface LeaveRequest {
  id: string; employeeId: string; employee?: Employee;
  type: LeaveType; fromDate: string; toDate: string; days: number;
  reason: string; status: LeaveStatus;
  approvedBy?: string; approvedAt?: string; rejectedReason?: string;
  deductFromPayroll: boolean; deductionMonth?: number; deductionYear?: number;
  createdAt: string; updatedAt: string;
}

// ── Loan ─────────────────────────────────────────────────────
export interface LoanRequest {
  id: string; employeeId: string; employee?: Employee;
  amount: number; tenure: number; emiAmount: number;
  purpose: string; status: LoanStatus;
  disbursedAt?: string; approvedBy?: string;
  remainingAmount: number; paidAmount: number;
  installments?: LoanInstallment[]; createdAt: string; updatedAt: string;
}
export interface LoanInstallment {
  id: string; loanId: string; month: number; year: number;
  amount: number; paid: boolean; paidAt?: string; payslipId?: string;
}

// ── Advance ──────────────────────────────────────────────────
export interface AdvanceRequest {
  id: string; employeeId: string; employee?: Employee;
  amount: number; reason: string; status: AdvanceStatus;
  deductionMonth?: number; deductionYear?: number;
  approvedBy?: string; approvedAt?: string; payslipId?: string;
  createdAt: string;
}

// ── Settings ─────────────────────────────────────────────────
export interface PayrollSettings {
  id: string; organizationId: string; region: Region;
  payDay: number; fiscalYearStart: number;
  workingDaysPerMonth: number;
  overtimeEnabled: boolean; overtimeMultiplier: number;
  wpsEnabled: boolean; wpsRoutingCode?: string;
  pfCeiling: number; esiCeiling: number;
  lwfState?: string; defaultTaxRegime: TaxRegime;
  gratuityEnabled: boolean; leaveEncashmentEnabled: boolean;
  annualLeaveEntitlement: number; sickLeaveEntitlement: number;
  maternityLeave: number; paternityLeave: number;
}

// ── Analytics ────────────────────────────────────────────────
export interface PayrollAnalytics {
  totalHeadcount: number; totalGrossPaid: number; totalNetPaid: number;
  totalDeductions: number; totalTaxDeducted: number;
  totalPfContribution: number; totalGratuityAccrued: number;
  totalEmployerCost: number; averageSalary: number;
  byDepartment: DeptAnalytics[]; monthlyTrend: MonthlyTrend[];
}
export interface DeptAnalytics { department: string; headcount: number; totalGross: number; totalNet: number; }
export interface MonthlyTrend  { month: string; gross: number; net: number; deductions: number; }

// ── Notification ─────────────────────────────────────────────
export interface Notification {
  id: string; userId: string; type: string;
  title: string; message: string; read: boolean; link?: string; createdAt: string;
}

// ── Pagination ───────────────────────────────────────────────
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; limit: number; totalPages: number; }
export interface ApiError { statusCode: number; message: string; error?: string; }

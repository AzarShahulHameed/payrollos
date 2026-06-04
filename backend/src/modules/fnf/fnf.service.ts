import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
 
function r2(n: number) { return Math.round(n * 100) / 100; }
 
@Injectable()
export class FnfService {
  constructor(private prisma: PrismaService) {}
 
  async calculateFnF(orgId: string, employeeId: string, lastWorkingDate: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
      include: { salaryStructure: true, department: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    if (emp.status === 'INACTIVE') throw new BadRequestException('Employee already settled');
 
    const lwd      = new Date(lastWorkingDate);
    const joining  = new Date(emp.joiningDate);
    const settings = await this.prisma.payrollSettings.findUnique({ where: { organizationId: orgId } });
    const workDays = settings?.defaultWorkingDays || 22;
 
    // ── Service duration ───────────────────────────────────────────
    const msPerDay  = 86400000;
    const totalDays = Math.round((lwd.getTime() - joining.getTime()) / msPerDay);
    const totalYears = totalDays / 365.25;
    const months    = Math.floor(totalDays / 30.44);
    const remDays   = Math.round(totalDays % 30.44);
 
    // ── Basic salary ───────────────────────────────────────────────
    const region   = emp.region;
    const ss       = emp.salaryStructure as any;
    const basicM   = region === 'UAE' ? (ss?.basicSalary || 0) : r2((ss?.ctcAnnual || 0) * (ss?.basicPct || 40) / 100 / 12);
    const grossM   = region === 'UAE'
      ? (ss?.basicSalary||0)+(ss?.housingAllowance||0)+(ss?.transportAllowance||0)+(ss?.medicalAllowance||0)+(ss?.otherAllowances||0)
      : r2((ss?.ctcAnnual||0)/12);
    const dailyRate = r2(grossM / workDays);
    const dailyBasic= r2(basicM / workDays);
 
    // ── Last month pro-rata ────────────────────────────────────────
    const lastMonthDays = lwd.getDate();
    const proRataSalary = r2(dailyRate * lastMonthDays);
 
    // ── Leave encashment (earned leaves × daily rate) ──────────────
    const leaveBalances = await this.prisma.leaveBalance.findMany({
      where: { employeeId, year: lwd.getFullYear(), leaveType: 'ANNUAL' },
    });
    const earnedLeaves   = leaveBalances.reduce((a, b) => a + b.remaining, 0);
    const leaveEncashment = r2(earnedLeaves * dailyRate);
 
    // ── Gratuity ───────────────────────────────────────────────────
    let gratuity = 0;
    if (region === 'UAE' && totalYears >= 1) {
      const dailyBasicUAE = r2((basicM * 12) / 365);
      gratuity = totalYears <= 5
        ? r2(dailyBasicUAE * 21 * totalYears)
        : r2(dailyBasicUAE * (21 * 5 + 30 * (totalYears - 5)));
      // Resignation discount — use completed years (floor)
      // < 3 completed yrs: 1/3rd of gratuity
      // 3-5 completed yrs: 2/3rd of gratuity
      // 5+ yrs: full gratuity
      const completedYears = Math.floor(totalYears);
      if (completedYears < 3)  gratuity = r2(gratuity / 3);
      else if (completedYears < 5) gratuity = r2(gratuity * 2 / 3);
      // else: full gratuity — no change
    } else if (region === 'INDIA' && totalYears >= 5) {
      gratuity = r2((basicM / 26) * 15 * Math.round(totalYears));
    }
 
    // ── Pending loans / advances ───────────────────────────────────
    const pendingLoans = await this.prisma.loanRequest.findMany({
      where: { employeeId, status: 'ACTIVE' },
    });
    const loanBalance = pendingLoans.reduce((a, l) => a + (l.remainingAmount || 0), 0);
 
    const pendingAdvances = await this.prisma.advanceRequest.findMany({
      where: { employeeId, status: 'APPROVED' },
    });
    const advanceBalance = pendingAdvances.reduce((a, a2) => a + a2.amount, 0);
 
    // ── Totals ─────────────────────────────────────────────────────
    const totalPayable    = r2(proRataSalary + leaveEncashment + gratuity);
    const totalRecoverable = r2(loanBalance + advanceBalance);
    const netSettlement   = r2(totalPayable - totalRecoverable);
 
    return {
      employee: {
        id: emp.id, name: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode, designation: emp.designation,
        department: emp.department?.name, joiningDate: joining, region,
      },
      lastWorkingDate: lwd,
      service: { totalDays, totalYears: +totalYears.toFixed(2), months, remDays },
      basicMonthly: basicM,
      grossMonthly: grossM,
      dailyRate,
      breakdown: {
        proRataSalary: { days: lastMonthDays, amount: proRataSalary, note: `${lastMonthDays} days × ${dailyRate}/day` },
        leaveEncashment: { days: earnedLeaves, amount: leaveEncashment, note: `${earnedLeaves} earned leaves × ${dailyRate}/day` },
        gratuity: { years: +totalYears.toFixed(2), amount: gratuity, note: region === 'UAE' ? `UAE Labour Law Art.51 · ${totalYears < 3 ? '1/3rd (< 3 yrs)' : totalYears < 5 ? '2/3rd (3-5 yrs)' : 'Full (5+ yrs)'}` : 'India: (Basic/26) × 15 × years (min 5 yrs)' },
        loanRecovery: { amount: -loanBalance, note: `${pendingLoans.length} active loan(s)` },
        advanceRecovery: { amount: -advanceBalance, note: `${pendingAdvances.length} pending advance(s)` },
      },
      totalPayable,
      totalRecoverable,
      netSettlement,
      currency: region === 'UAE' ? 'AED' : 'INR',
    };
  }
 
  async processFnF(orgId: string, employeeId: string, lastWorkingDate: string) {
    const calc = await this.calculateFnF(orgId, employeeId, lastWorkingDate);
 
    // Mark employee as inactive
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { status: 'INACTIVE' },
    });
 
    // Close all active loans
    await this.prisma.loanRequest.updateMany({
      where: { employeeId, status: 'ACTIVE' },
      data: { status: 'CLOSED' },
    });
 
    // Record in audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        entity: 'EMPLOYEE',
        entityId: employeeId,
        action: 'FULL_AND_FINAL',
        changes: { netSettlement: calc.netSettlement, lastWorkingDate },
      },
    }).catch(() => {});
 
    return { ...calc, processed: true };
  }
 
  async getFnFList(orgId: string) {
    const inactive = await this.prisma.employee.findMany({
      where: { organizationId: orgId, status: 'INACTIVE' },
      include: { department: true },
    });
    return inactive;
  }
}
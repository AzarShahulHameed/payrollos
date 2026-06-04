import { NotificationHelper } from '../../common/notification.helper';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
import { EmailService } from '../email/email.service';
import { PayrunStatus, Prisma } from '@prisma/client';
import { calcUAE, calcIndia } from '../payroll/payroll.engine';

@Injectable()
export class PayrunService {
  constructor(private prisma: PrismaService, private email: EmailService) {}

  async findAll(orgId: string, query: { region?: string; year?: string; month?: string }) {
    return this.prisma.payrun.findMany({
      where: {
        organizationId: orgId,
        ...(query.region && { region: query.region as any }),
        ...(query.year   && { year:  +query.year }),
        ...(query.month  && { month: +query.month }),
      },
      include: { _count: { select: { payslips: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(orgId: string, id: string) {
    const payrun = await this.prisma.payrun.findFirst({
      where: { id, organizationId: orgId },
      include: {
        payslips: {
          include: { employee: { include: { department: true } } },
          orderBy: { employee: { firstName: 'asc' } },
        },
      },
    });
    if (!payrun) throw new NotFoundException('Payrun not found');
    return payrun;
  }

  // Get or create a DRAFT payrun for the given month/year/region
  async getOrCreateDraft(orgId: string, year: number, month: number, region: string) {
    const existing = await this.prisma.payrun.findFirst({
      where: { organizationId: orgId, year, month, region: region as any },
    });
    if (existing) {
      if (existing.status !== 'DRAFT') return existing;
      // Regenerate payslips for draft (picks up any changes made during month)
      return this.generatePayslips(orgId, existing.id);
    }

    const payrun = await this.prisma.payrun.create({
      data: {
        organizationId: orgId,
        year, month,
        region: region as any,
        status: 'DRAFT',
        name: `${this.monthName(month)} ${year} Payroll`,
      },
    });
    return this.generatePayslips(orgId, payrun.id);
  }

  async generatePayslips(orgId: string, payrunId: string) {
    const payrun = await this.prisma.payrun.findFirst({
      where: { id: payrunId, organizationId: orgId },
    });
    if (!payrun) throw new NotFoundException('Payrun not found');
    if (!['DRAFT'].includes(payrun.status)) {
      throw new BadRequestException('Can only regenerate DRAFT payruns');
    }

    const settings = await this.prisma.payrollSettings.findUnique({
      where: { organizationId: orgId },
    });

    const employees = await this.prisma.employee.findMany({
      where: { organizationId: orgId, region: payrun.region, status: 'ACTIVE' },
      include: {
        salaryStructure: true,
        leaveRequests: {
          where: {
            status: 'APPROVED',
            // Fetch any leave that overlaps with the payrun month
            startDate: { lte: new Date(payrun.year, payrun.month, 0) },  // starts on or before month end
            endDate:   { gte: new Date(payrun.year, payrun.month - 1, 1) }, // ends on or after month start
          },
        },
        loanRequests: {
          where: { status: 'ACTIVE' },
          include: { installmentsList: { where: { month: payrun.month, year: payrun.year } } },
        },
        advanceRequests: {
          where: { status: 'APPROVED', deductionMonth: payrun.month, deductionYear: payrun.year },
        },
      },
    });

    // Fetch approved reimbursements for this month (adds to gross pay)
    const reimbursements = await (this.prisma as any).reimbursement.findMany({
      where: {
        organizationId: orgId,
        status: 'APPROVED',
        paymentMonth: payrun.month,
        paymentYear: payrun.year,
      },
    }).catch(() => []);

    // Delete old payslips for this payrun
    await this.prisma.payslip.deleteMany({ where: { payrunId } });

    let totalGross = 0, totalNet = 0, totalDeductions = 0;
    const workingDays = settings?.defaultWorkingDays || 22;

    for (const emp of employees) {
      const ss = emp.salaryStructure;
      if (!ss) continue;

      // Calculate LOP days from approved leaves — clamp to payrun month
      const monthStart = new Date(payrun.year, payrun.month - 1, 1);
      const monthEnd   = new Date(payrun.year, payrun.month, 0);
      const lopDays = emp.leaveRequests.reduce((acc, l) => {
        // Clamp leave dates to current month boundary
        const from = l.startDate < monthStart ? monthStart : l.startDate;
        const to   = l.endDate   > monthEnd   ? monthEnd   : l.endDate;
        const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
        return acc + (l.isPaid ? 0 : Math.max(0, days));
      }, 0);
      const daysWorked = Math.max(0, workingDays - lopDays);

      // Loan EMI for this month
      const loanEmi = emp.loanRequests.reduce((acc, loan) => {
        const inst = loan.installmentsList.find(i => i.month === payrun.month && i.year === payrun.year);
        return acc + (inst?.amount || 0);
      }, 0);

      // Advance deduction
      const advanceDeduction = emp.advanceRequests.reduce((acc, a) => acc + a.amount, 0);

      // Reimbursements for this employee this month
      const empReimb = reimbursements.filter((r: any) => r.employeeId === emp.id);
      const reimbTotal = empReimb.reduce((a: number, r: any) => a + r.amount, 0);

      let calc;
      if (payrun.region === 'UAE') {
        calc = calcUAE({
          basicSalary:       ss.basicSalary,
          housingAllowance:  ss.housingAllowance || 0,
          transportAllowance:ss.transportAllowance || 0,
          otherAllowances:   ss.otherAllowances || 0,
          medicalAllowance:  ss.medicalAllowance || 0,
          workingDays,
          daysWorked,
          yearsOfService:    this.yearsOfService(emp.joiningDate),
          isUaeNational:     emp.isUaeNational || false,
          loanEmi,
          advanceDeduction,
          overtimeAmount:    0,
          bonusAmount:       0,
        });
        // Reimbursements: add to net pay (non-taxable expense recovery)
        if (reimbTotal > 0) calc = { ...calc, netSalary: calc.netSalary + reimbTotal, reimbursementAmount: reimbTotal };
      } else {
        calc = calcIndia({
          ctcAnnual:         ss.ctcAnnual || 0,
          basicPct:          ss.basicPct || 40,
          hraPct:            ss.hraPct || 50,
          cityType:          (ss.cityType as any) || 'METRO',
          actualRentMonthly: ss.actualRentMonthly || 0,
          workingDays,
          daysWorked,
          pfEnabled:         ss.pfEnabled !== false,
          pfOptOut:          ss.pfOptOut || false,
          esiEnabled:        ss.esiEnabled !== false,
          ptEnabled:         ss.ptEnabled !== false,
          lwfEnabled:        ss.lwfEnabled || false,
          lwfState:          ss.lwfState || 'TAMIL_NADU',
          taxRegime:         (ss.taxRegime as any) || 'NEW',
          sec123Investment:  ss.sec123Investment || 0,
          sec126Premium:     ss.sec126Premium || 0,
          homeLoanInterest:  ss.homeLoanInterest || 0,
          npsEmployee:       ss.npsEmployee || 0,
          yearsOfService:    this.yearsOfService(emp.joiningDate),
          loanEmi,
          advanceDeduction,
          overtimeAmount:    0,
          bonusAmount:       0,
          payMonth:          payrun.month,
        });
        // Reimbursements: add to net pay (non-taxable)
        if (reimbTotal > 0) calc = { ...calc, netSalary: calc.netSalary + reimbTotal, reimbursementAmount: reimbTotal };
      }

      await this.prisma.payslip.create({
        data: {
          payrunId, employeeId: emp.id, organizationId: orgId,
          region: payrun.region,
          year: payrun.year, month: payrun.month,
          status: 'DRAFT',
          basicSalary:        calc.basicSalary,
          housingAllowance:   calc.housingAllowance,
          transportAllowance: calc.transportAllowance,
          medicalAllowance:   calc.medicalAllowance,
          otherAllowances:    calc.otherAllowances,
          specialAllowance:   calc.specialAllowance,
          overtimeAmount:     calc.overtimeAmount,
          bonusAmount:        calc.bonusAmount,
          grossSalary:        calc.grossSalary,
          lopDays:            calc.lopDays,
          lopDeduction:       calc.lopDeduction,
          pfEmployee:         calc.pfEmployee,
          pfEmployer:         calc.pfEmployer,
          esiEmployee:        calc.esiEmployee,
          esiEmployer:        calc.esiEmployer,
          professionalTax:    calc.professionalTax,
          lwfEmployee:        calc.lwfEmployee,
          lwfEmployer:        calc.lwfEmployer,
          tdsAmount:          calc.tdsAmount,
          loanDeduction:      calc.loanDeduction,
          advanceDeduction:   calc.advanceDeduction,
          totalDeductions:    calc.totalDeductions,
          netSalary:          calc.netSalary,
          gratuityAccrual:    calc.gratuityAccrual,
          gpssaEmployee:      calc.gpssaEmployee || 0,
          gpssaEmployer:      calc.gpssaEmployer || 0,
        },
      });

      totalGross      += calc.grossSalary;
      totalNet        += calc.netSalary;
      totalDeductions += calc.totalDeductions;
    }

    return this.prisma.payrun.update({
      where: { id: payrunId },
      data: { totalGross, totalNet, totalDeductions, employeeCount: employees.length },
      include: { _count: { select: { payslips: true } } },
    });
  }

  async submitForReview(orgId: string, id: string) {
    return this.changeStatus(orgId, id, 'DRAFT', 'IN_REVIEW');
  }

  async approve(orgId: string, id: string) {
    return this.changeStatus(orgId, id, 'IN_REVIEW', 'APPROVED');
  }

  async process(orgId: string, id: string) {
    const payrun = await this.changeStatus(orgId, id, 'APPROVED', 'PROCESSED');
    // Mark all payslips as PROCESSED
    await this.prisma.payslip.updateMany({
      where: { payrunId: id },
      data: { status: 'PROCESSED' },
    });
    return payrun;
  }

  async markPaid(orgId: string, id: string) {
    const payrun = await this.changeStatus(orgId, id, 'PROCESSED', 'PAID');
    const now = new Date();

    await this.prisma.payslip.updateMany({
      where: { payrunId: id },
      data: { status: 'PAID', paidAt: now },
    });

    // Auto-mark loan installments as PAID for this payrun month/year (BUG-4 fix)
    const fullPayrun = await this.prisma.payrun.findFirst({ where: { id } });
    if (fullPayrun) {
      const installments = await this.prisma.loanInstallment.findMany({
        where: { month: fullPayrun.month, year: fullPayrun.year, status: 'PENDING' },
        include: { loanRequest: { include: { employee: { select: { organizationId: true } } } } },
      });
      for (const inst of installments) {
        if (inst.loanRequest?.employee?.organizationId === orgId) {
          await this.prisma.loanInstallment.update({ where: { id: inst.id }, data: { status: 'PAID', paidAt: now } });
          // Update loan remaining amount
          const loan = inst.loanRequest;
          const remaining = Math.max(0, (loan.remainingAmount || loan.amount) - inst.amount);
          await this.prisma.loanRequest.update({
            where: { id: loan.id },
            data: { remainingAmount: remaining, status: remaining <= 0 ? 'CLOSED' : 'ACTIVE' },
          });
        }
      }

      // Auto-mark advances as DEDUCTED (BUG-5 fix)
      await this.prisma.advanceRequest.updateMany({
        where: {
          employee: { organizationId: orgId },
          status: 'APPROVED',
          deductionMonth: fullPayrun.month,
          deductionYear: fullPayrun.year,
        },
        data: { status: 'DEDUCTED' },
      });

      // Mark reimbursements as PAID (BUG-3 follow-up)
      await (this.prisma as any).reimbursement.updateMany({
        where: {
          organizationId: orgId,
          status: 'APPROVED',
          paymentMonth: fullPayrun.month,
          paymentYear: fullPayrun.year,
        },
        data: { status: 'PAID' },
      }).catch(() => {});
    }

    // Send payslip email notifications to all employees
    try {
      const paidPayslips = await this.prisma.payslip.findMany({
        where: { payrunId: id },
        include: { employee: true, payrun: true },
      });
      for (const slip of paidPayslips) {
        if (slip.employee?.email) {
          const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
          // Note: EmailService is injected globally; skip if not available
          if ((this as any).emailService) {
            await (this as any).emailService.sendPayslipReady(slip.employee, slip.payrun, org?.name || 'Company').catch(() => {});
          }
        }
      }
    } catch {}

    return payrun;
  }

  private async changeStatus(orgId: string, id: string, from: PayrunStatus, to: PayrunStatus) {
    const payrun = await this.prisma.payrun.findFirst({ where: { id, organizationId: orgId } });
    if (!payrun) throw new NotFoundException('Payrun not found');
    if (payrun.status !== from) throw new BadRequestException(`Payrun must be in ${from} status`);
    return this.prisma.payrun.update({ where: { id }, data: { status: to } });
  }

  private yearsOfService(joiningDate: Date): number {
    const ms = Date.now() - new Date(joiningDate).getTime();
    return Math.max(0, ms / (365.25 * 24 * 3600 * 1000));
  }

  private monthName(m: number): string {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
  }
}

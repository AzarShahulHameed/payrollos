import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getPayrollSummary(orgId: string, payrunId: string) {
    const payrun = await this.prisma.payrun.findFirst({
      where: { id: payrunId, organizationId: orgId },
      include: {
        payslips: {
          include: { employee: { include: { department: true } } },
          orderBy: { employee: { firstName: 'asc' } },
        },
      },
    });
    if (!payrun) return null;

    return {
      payrun,
      summary: {
        totalGross: payrun.totalGross,
        totalNet: payrun.totalNet,
        totalDeductions: payrun.totalDeductions,
        employeeCount: payrun.employeeCount,
        pfEmployee: payrun.payslips.reduce((a, p) => a + p.pfEmployee, 0),
        pfEmployer: payrun.payslips.reduce((a, p) => a + p.pfEmployer, 0),
        esiEmployee: payrun.payslips.reduce((a, p) => a + p.esiEmployee, 0),
        esiEmployer: payrun.payslips.reduce((a, p) => a + p.esiEmployer, 0),
        tdsTotal: payrun.payslips.reduce((a, p) => a + p.tdsAmount, 0),
        ptTotal: payrun.payslips.reduce((a, p) => a + p.professionalTax, 0),
        gratuityTotal: payrun.payslips.reduce((a, p) => a + p.gratuityAccrual, 0),
      },
    };
  }

  async getPfEsiChallan(orgId: string, year: number, month: number) {
    const payslips = await this.prisma.payslip.findMany({
      where: {
        organizationId: orgId, year, month,
        region: 'INDIA',
        status: { in: ['PROCESSED', 'PAID'] },
      },
      include: { employee: true },
    });

    return payslips.map(p => ({
      employeeCode: p.employee.employeeCode,
      name: `${p.employee.firstName} ${p.employee.lastName}`,
      uan: p.employee.uanNumber,
      pfEmployee: p.pfEmployee,
      pfEmployer: p.pfEmployer,
      esiEmployee: p.esiEmployee,
      esiEmployer: p.esiEmployer,
      basic: p.basicSalary,
      gross: p.grossSalary,
    }));
  }

  async getWpsReport(orgId: string, payrunId: string) {
    const payrun = await this.prisma.payrun.findFirst({
      where: { id: payrunId, organizationId: orgId, region: 'UAE' },
      include: { payslips: { include: { employee: true } } },
    });
    if (!payrun) return null;

    return payrun.payslips.map(p => ({
      employeeCode: p.employee.employeeCode,
      name: `${p.employee.firstName} ${p.employee.lastName}`,
      bankAccount: p.employee.bankAccount,
      iban: p.employee.iban,
      netSalary: p.netSalary,
      currency: 'AED',
    }));
  }

  async getForm16(orgId: string, employeeId: string, year: number) {
    const payslips = await this.prisma.payslip.findMany({
      where: {
        organizationId: orgId, employeeId,
        region: 'INDIA', year,
        status: { in: ['PROCESSED', 'PAID'] },
      },
      include: { employee: { include: { salaryStructure: true } } },
      orderBy: { month: 'asc' },
    });

    const emp = payslips[0]?.employee;
    if (!payslips.length || !emp) return null;

    const annualGross    = payslips.reduce((a, p) => a + p.grossSalary, 0);
    const annualPf       = payslips.reduce((a, p) => a + p.pfEmployee, 0);
    const annualTds      = payslips.reduce((a, p) => a + p.tdsAmount, 0);
    const annualPt       = payslips.reduce((a, p) => a + p.professionalTax, 0);
    const annualHra      = payslips.reduce((a, p) => a + p.housingAllowance, 0);
    const taxableIncome  = payslips[payslips.length - 1]?.taxableIncome || 0;
    const regime         = emp.salaryStructure?.taxRegime || 'NEW';
    const stdDeduction   = regime === 'NEW' ? 75000 : 50000;

    const cess        = +(annualTds * 0.04 / 1.04).toFixed(2);
    const taxBefore   = +(annualTds - cess).toFixed(2);
    const sec123      = (emp.salaryStructure?.sec123Investment || 0);
    const sec126      = (emp.salaryStructure?.sec126Premium    || 0);

    return {
      employee: {
        name: `${emp.firstName} ${emp.lastName}`,
        pan: emp.panNumber,
        employeeCode: emp.employeeCode,
        designation: emp.designation,
      },
      financialYear: `${year}-${year + 1}`,
      regime, stdDeduction,
      annualGross, annualPf, annualTds, annualPt, annualHra,
      taxableIncome, taxBeforeCess: taxBefore, annualCess: cess,
      sec123, sec126,
      monthsCovered: payslips.length,
      monthlyBreakdown: payslips.map(p => ({
        month: p.month, gross: p.grossSalary, tds: p.tdsAmount, pf: p.pfEmployee,
      })),
    };
  }

  async getSalaryRegister(orgId: string, year: number, month: number, region?: string) {
    return this.prisma.payslip.findMany({
      where: {
        organizationId: orgId, year, month,
        ...(region && { region: region as any }),
        status: { in: ['PROCESSED', 'PAID', 'DRAFT'] },
      },
      include: {
        employee: { include: { department: true } },
      },
      orderBy: { employee: { firstName: 'asc' } },
    });
  }

  async getBankTransferCSV(orgId: string, payrunId: string): Promise<string> {
    const payslips = await this.prisma.payslip.findMany({
      where: { payrunId, organizationId: orgId },
      include: { employee: true, payrun: true },
    });
    const headers = ['Employee Code','Employee Name','Bank Account','IFSC','Net Salary','Remarks'];
    const rows = payslips.map(p => [
      p.employee?.employeeCode || '',
      `${p.employee?.firstName} ${p.employee?.lastName}`,
      (p.employee as any)?.bankAccount || '',
      (p.employee as any)?.ifscCode   || '',
      p.netSalary.toFixed(2),
      `Salary ${p.payrun?.month}/${p.payrun?.year}`,
    ]);
    return [headers, ...rows].map(r => r.join(',')).join('\n');
  }

  async getForm24Q(orgId: string, year: number, quarter: number): Promise<any> {
    const qMonths: Record<number, number[]> = { 1:[4,5,6], 2:[7,8,9], 3:[10,11,12], 4:[1,2,3] };
    const months = qMonths[quarter] || [4,5,6];
    const payslips = await this.prisma.payslip.findMany({
      where: { organizationId: orgId, region: 'INDIA', year, month: { in: months } },
      include: { employee: true },
    });
    const total = payslips.reduce((a, p) => a + (p.tdsAmount || 0), 0);
    return {
      year, quarter, months, totalTDS: total,
      employees: payslips.length,
      deductees: payslips.map(p => ({
        pan: (p.employee as any)?.panNumber || 'PANNOTAVBL',
        name: `${p.employee?.firstName} ${p.employee?.lastName}`,
        gross: p.grossSalary, tds: p.tdsAmount, month: p.month,
      })),
    };
  }

}

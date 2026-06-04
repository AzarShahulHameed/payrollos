import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class WpsService {
  constructor(private prisma: PrismaService) {}

  async generateSIF(orgId: string, payrunId: string): Promise<{ sif: string; included: number; skipped: any[] }> {
    const payrun = await this.prisma.payrun.findFirst({
      where: { id: payrunId, organizationId: orgId, region: 'UAE' },
      include: { payslips: { include: { employee: true } }, organization: true },
    });
    if (!payrun) throw new NotFoundException('Payrun not found or not UAE');

    const org      = payrun.organization;
    const settings = await this.prisma.payrollSettings.findUnique({ where: { organizationId: orgId } });
    const routingCode = (settings as any)?.wpsRoutingCode || '000';

    // Separate slips — only include employees WITH a valid IBAN
    const validSlips   = payrun.payslips.filter(s => s.employee.iban && s.employee.iban.trim().length > 5);
    const skippedSlips = payrun.payslips.filter(s => !s.employee.iban || s.employee.iban.trim().length <= 5);
    const skipped = skippedSlips.map(s => ({
      employeeCode: s.employee.employeeCode,
      name: `${s.employee.firstName} ${s.employee.lastName}`,
      netSalary: s.netSalary,
      reason: 'Missing or invalid IBAN',
    }));

    const totalNet = validSlips.reduce((sum, s) => sum + s.netSalary, 0);
    const payDate    = new Date(payrun.year, payrun.month - 1, settings?.payDay || 28);
    const payDateStr = payDate.toISOString().slice(0, 10).replace(/-/g, '');
    const lines: string[] = [];

    // EDR
    lines.push([
      'EDR',
      org.taxId?.replace(/[^0-9]/g, '').padStart(15, '0') || '000000000000000',
      org.name.substring(0, 50).padEnd(50, ' '),
      routingCode.padStart(9, '0'),
      payDateStr,
      validSlips.length.toString().padStart(6, '0'),
      Math.round(totalNet * 100).toString().padStart(15, '0'),
      'AED',
    ].join('|'));

    // EDB — only valid employees
    for (const slip of validSlips) {
      const emp = slip.employee;
      lines.push([
        'EDB',
        emp.employeeCode.padStart(20, '0'),
        `${emp.firstName} ${emp.lastName}`.substring(0, 50).padEnd(50, ' '),
        emp.iban!.trim().padStart(23, '0'),
        Math.round(slip.netSalary * 100).toString().padStart(15, '0'),
        'AED',
        payDateStr,
        'SALARY',
        payrun.month.toString().padStart(2, '0'),
        payrun.year.toString(),
      ].join('|'));
    }

    // TRL
    lines.push([
      'TRL',
      validSlips.length.toString().padStart(6, '0'),
      Math.round(totalNet * 100).toString().padStart(15, '0'),
    ].join('|'));

    return { sif: lines.join('\n'), included: validSlips.length, skipped };
  }

  async getWpsReport(orgId: string, payrunId: string) {
    const payrun = await this.prisma.payrun.findFirst({
      where: { id: payrunId, organizationId: orgId },
      include: { payslips: { include: { employee: true } } },
    });
    if (!payrun) throw new NotFoundException('Payrun not found');
    return payrun.payslips.map(s => ({
      employeeCode: s.employee.employeeCode,
      name: `${s.employee.firstName} ${s.employee.lastName}`,
      iban: s.employee.iban || '—',
      bankAccount: s.employee.bankAccount || '—',
      netSalary: s.netSalary,
      currency: 'AED',
    }));
  }
}

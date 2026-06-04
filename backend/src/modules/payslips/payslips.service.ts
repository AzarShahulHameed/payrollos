import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
 
@Injectable()
export class PayslipsService {
  constructor(private prisma: PrismaService) {}
 
  async list(orgId: string, region?: string, month?: string, employeeId?: string) {
    const where: any = {
      organizationId: orgId,
      // Only show payslips from processed or paid payruns — never show DRAFT
      payrun: { status: { in: ['PROCESSED', 'PAID'] } },
    };
    if (region)     where.region     = region as any;
    if (employeeId) where.employeeId = employeeId;
    if (month && month.includes('-')) {
      const [year, m] = month.split('-').map(Number);
      if (!isNaN(year) && !isNaN(m)) { where.year = year; where.month = m; }
    }
    return this.prisma.payslip.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, photoUrl: true, department: { select: { name: true } } } },
        payrun: { select: { year: true, month: true, status: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }
 
  async mySlips(userId: string, q: any) {
    const emp = await this.prisma.employee.findFirst({ where: { userId } });
    if (!emp) return [];
    return this.prisma.payslip.findMany({
      where: { employeeId: emp.id },
      include: { payrun: { select: { year: true, month: true, status: true } }, employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }
 
  async get(id: string, orgId: string) {
    const slip = await this.prisma.payslip.findFirst({
      where: { id, organizationId: orgId },
      include: {
        employee: { include: { department: true } },
        payrun: true,
      },
    });
    if (!slip) throw new NotFoundException('Payslip not found');
    // Attach org details so payslip PDF shows org name/logo from settings
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, email: true, phone: true, address: true, logoUrl: true, taxId: true },
    });
    return { ...slip, organization: org };
  }
 
  async getYTD(orgId: string, employeeId: string, year?: number) {
    const yr = year || new Date().getFullYear();
    const slips = await this.prisma.payslip.findMany({
      where: { organizationId: orgId, employeeId, year: yr, status: { in: ['PROCESSED', 'PAID'] } },
      orderBy: { month: 'asc' },
    });
    const ytd = slips.reduce((acc, s) => ({
      grossSalary:     acc.grossSalary     + s.grossSalary,
      netSalary:       acc.netSalary       + s.netSalary,
      totalDeductions: acc.totalDeductions + s.totalDeductions,
      pfEmployee:      acc.pfEmployee      + s.pfEmployee,
      tdsAmount:       acc.tdsAmount       + s.tdsAmount,
      lopDeduction:    acc.lopDeduction    + s.lopDeduction,
    }), { grossSalary: 0, netSalary: 0, totalDeductions: 0, pfEmployee: 0, tdsAmount: 0, lopDeduction: 0 });
    return { year: yr, monthsProcessed: slips.length, ytd, monthly: slips };
  }
 
  async compare(orgId: string, employeeId: string, month1: string, month2: string) {
    const parse = (m: string) => m.split('-').map(Number);
    const [y1, m1] = parse(month1);
    const [y2, m2] = parse(month2);
    const [slip1, slip2] = await Promise.all([
      this.prisma.payslip.findFirst({ where: { organizationId: orgId, employeeId, year: y1, month: m1 } }),
      this.prisma.payslip.findFirst({ where: { organizationId: orgId, employeeId, year: y2, month: m2 } }),
    ]);
    return { slip1, slip2 };
  }
}
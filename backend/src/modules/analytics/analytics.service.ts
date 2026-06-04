import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getKpi(orgId: string, region?: string) {
    const rf = region ? { region: region as any } : {};

    // Get last processed/paid payrun — primary source of truth
    const lastPayrun = await this.prisma.payrun.findFirst({
      where: { organizationId: orgId, ...rf, status: { in: ['PROCESSED','PAID'] } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Employee count: try direct filter, fallback to payrun.employeeCount
    let totalEmployees = await this.prisma.employee.count({
      where: { organizationId: orgId, status: 'ACTIVE', ...rf },
    });
    if (totalEmployees === 0 && lastPayrun?.employeeCount) {
      totalEmployees = lastPayrun.employeeCount;
    }

    // If payrun totalGross is 0 or null, aggregate from payslips
    let totalGross      = lastPayrun?.totalGross      ?? 0;
    let totalNet        = lastPayrun?.totalNet        ?? 0;
    let totalDeductions = lastPayrun?.totalDeductions ?? 0;

    if ((totalGross === 0 || totalGross === null) && lastPayrun) {
      const agg = await this.prisma.payslip.aggregate({
        where: { payrunId: lastPayrun.id },
        _sum: { grossSalary: true, netSalary: true, totalDeductions: true },
      });
      totalGross      = agg._sum.grossSalary      ?? 0;
      totalNet        = agg._sum.netSalary        ?? 0;
      totalDeductions = agg._sum.totalDeductions  ?? 0;
    }

    const [activeLoans, processedPayruns] = await Promise.all([
      this.prisma.loanRequest.count({
        where: { employee: { organizationId: orgId }, status: 'ACTIVE' },
      }),
      this.prisma.payrun.count({
        where: {
          organizationId: orgId, ...rf,
          status: { in: ['PROCESSED','PAID'] },
          year: new Date().getFullYear(),
        },
      }),
    ]);

    return {
      totalEmployees, totalGross, totalNet, totalDeductions,
      activeLoans, processedPayruns,
      lastPayrunMonth: lastPayrun?.month ?? null,
      lastPayrunYear:  lastPayrun?.year  ?? null,
    };
  }

  async getTrend(orgId: string, region?: string, months = 12) {
    const rf = region ? { region: region as any } : {};
    const payruns = await this.prisma.payrun.findMany({
      where: { organizationId: orgId, ...rf, status: { in: ['PROCESSED','PAID'] } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: months,
    });

    // For each payrun, get totals (either from payrun fields or aggregate payslips)
    const results = await Promise.all(payruns.map(async (p) => {
      let gross = p.totalGross ?? 0;
      let net   = p.totalNet   ?? 0;
      let deds  = p.totalDeductions ?? 0;

      if (!gross) {
        const agg = await this.prisma.payslip.aggregate({
          where: { payrunId: p.id },
          _sum: { grossSalary: true, netSalary: true, totalDeductions: true },
        });
        gross = agg._sum.grossSalary     ?? 0;
        net   = agg._sum.netSalary       ?? 0;
        deds  = agg._sum.totalDeductions ?? 0;
      }

      return {
        label:      `${this.ms(p.month)} ${p.year}`,
        month:      p.month, year: p.year,
        gross, net, deductions: deds,
        employees:  p.employeeCount ?? 0,
      };
    }));

    return results.reverse();
  }

  async getByDepartment(orgId: string, region?: string) {
    const rf = region ? { region: region as any } : {};
    const latestPayrun = await this.prisma.payrun.findFirst({
      where: { organizationId: orgId, ...rf, status: { in: ['PROCESSED','PAID'] } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    if (!latestPayrun) return [];

    const payslips = await this.prisma.payslip.findMany({
      where: { payrunId: latestPayrun.id },
      include: { employee: { include: { department: true } } },
    });

    const map = new Map<string, { name: string; gross: number; net: number; count: number }>();
    for (const s of payslips) {
      const key  = s.employee?.departmentId || 'unassigned';
      const name = s.employee?.department?.name || 'Unassigned';
      if (!map.has(key)) map.set(key, { name, gross: 0, net: 0, count: 0 });
      const d = map.get(key)!;
      d.gross += s.grossSalary; d.net += s.netSalary; d.count++;
    }

    return Array.from(map.entries())
      .map(([id, d]) => ({ id, department: d.name, gross: d.gross, net: d.net, employeeCount: d.count }))
      .sort((a, b) => b.gross - a.gross);
  }

  async getDecompositionTree(orgId: string, region?: string, payrunId?: string) {
    const rf = region ? { region: region as any } : {};
    let pid = payrunId;
    if (!pid) {
      const p = await this.prisma.payrun.findFirst({
        where: { organizationId: orgId, ...rf, status: { in: ['PROCESSED','PAID'] } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
      pid = p?.id;
    }
    if (!pid) return { total: 0, departments: [] };

    const payslips = await this.prisma.payslip.findMany({
      where: { payrunId: pid },
      include: { employee: { include: { department: true } } },
    });

    const map = new Map<string, { name: string; gross: number; employees: any[] }>();
    for (const s of payslips) {
      const key = s.employee?.departmentId || 'unassigned';
      if (!map.has(key)) map.set(key, { name: s.employee?.department?.name || 'Unassigned', gross: 0, employees: [] });
      const d = map.get(key)!;
      d.gross += s.grossSalary;
      d.employees.push({
        id: s.employee.id, name: `${s.employee.firstName} ${s.employee.lastName}`,
        designation: s.employee.designation, photoUrl: s.employee.photoUrl,
        gross: s.grossSalary, net: s.netSalary, deductions: s.totalDeductions,
      });
    }

    const total = payslips.reduce((a, s) => a + s.grossSalary, 0);
    return {
      total,
      departments: Array.from(map.entries()).map(([id, d]) => ({
        id, name: d.name, gross: d.gross,
        pct: total > 0 ? Math.round(d.gross / total * 100) : 0,
        employees: d.employees.sort((a, b) => b.gross - a.gross),
      })).sort((a, b) => b.gross - a.gross),
    };
  }

  private ms(m: number) {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1] ?? '';
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

function r2(n: number) { return Math.round(n * 100) / 100; }

@Injectable()
export class ArrearsService {
  constructor(private prisma: PrismaService) {}

  // Calculate arrears when salary is revised with effective date
  async calculateArrears(orgId: string, employeeId: string, dto: {
    effectiveDate: string;
    newBasicSalary?: number;
    newCtcAnnual?:  number;
    newHousing?:    number;
    newTransport?:  number;
    reason?:        string;
  }) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
      include: { salaryStructure: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const effective = new Date(dto.effectiveDate);
    const now       = new Date();
    const region    = emp.region;
    const ss        = emp.salaryStructure as any;
    const settings  = await this.prisma.payrollSettings.findUnique({ where: { organizationId: orgId } });
    const workDays  = settings?.defaultWorkingDays || 22;

    // Old gross
    const oldGross = region === 'UAE'
      ? (ss?.basicSalary||0)+(ss?.housingAllowance||0)+(ss?.transportAllowance||0)+(ss?.medicalAllowance||0)+(ss?.otherAllowances||0)
      : r2((ss?.ctcAnnual||0)/12);

    // New gross
    const newBasic   = dto.newBasicSalary  || ss?.basicSalary  || 0;
    const newHousing = dto.newHousing      || ss?.housingAllowance || 0;
    const newTransport = dto.newTransport  || ss?.transportAllowance || 0;
    const newCTC     = dto.newCtcAnnual    || ss?.ctcAnnual     || 0;
    const newGross   = region === 'UAE'
      ? newBasic + newHousing + newTransport + (ss?.medicalAllowance||0) + (ss?.otherAllowances||0)
      : r2(newCTC / 12);

    const diff = r2(newGross - oldGross);

    // Calculate for how many months arrears are due
    // From effective date to current month
    const startMonth = effective.getMonth();
    const startYear  = effective.getFullYear();
    const endMonth   = now.getMonth();
    const endYear    = now.getFullYear();
    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);

    // Pro-rata for effective month (partial month)
    const effectiveDay  = effective.getDate();
    const daysInMonth   = new Date(startYear, startMonth + 1, 0).getDate();
    const remainingDays = daysInMonth - effectiveDay + 1;
    const proRataMonth  = r2(diff * (remainingDays / daysInMonth));

    // Full months
    const fullMonths      = Math.max(0, totalMonths - 1);
    const fullMonthAmount = r2(diff * fullMonths);
    const totalArrears    = r2(proRataMonth + fullMonthAmount);

    return {
      employee: { id: emp.id, name: `${emp.firstName} ${emp.lastName}`, employeeCode: emp.employeeCode },
      effectiveDate:  effective,
      oldGross,
      newGross,
      monthlyDiff:    diff,
      breakdown: {
        proRataMonth: { days: remainingDays, amount: proRataMonth, note: `${remainingDays}/${daysInMonth} days of first month` },
        fullMonths:   { months: fullMonths,  amount: fullMonthAmount, note: `${fullMonths} complete months × ${diff}/month` },
      },
      totalArrears,
      currency: region === 'UAE' ? 'AED' : 'INR',
      reason: dto.reason,
    };
  }

  async applyArrears(orgId: string, employeeId: string, dto: any) {
    const calc = await this.calculateArrears(orgId, employeeId, dto);
    const ss   = await this.prisma.salaryStructure.findFirst({ where: { employeeId } }) as any;

    // Update salary structure with new values
    const updateData: any = {};
    if (dto.newBasicSalary) updateData.basicSalary     = +dto.newBasicSalary;
    if (dto.newCtcAnnual)   updateData.ctcAnnual       = +dto.newCtcAnnual;
    if (dto.newHousing)     updateData.housingAllowance= +dto.newHousing;
    if (dto.newTransport)   updateData.transportAllowance= +dto.newTransport;

    await this.prisma.salaryStructure.update({
      where: { id: ss.id },
      data: { ...updateData, effectiveFrom: new Date(dto.effectiveDate) },
    });

    return { ...calc, applied: true, message: `Salary updated. Arrears of ${calc.currency} ${calc.totalArrears.toLocaleString()} will be added to next payrun.` };
  }
}

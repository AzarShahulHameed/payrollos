import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.module';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async globalSearch(@Request() req, @Query('q') q: string) {
    if (!q || q.length < 2) return { employees: [], payslips: [], payruns: [] };
    const orgId = req.user.orgId;

    const [employees, payslips, payruns] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          organizationId: orgId, status: 'ACTIVE',
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
            { employeeCode: { contains: q, mode: 'insensitive' } },
            { email:        { contains: q, mode: 'insensitive' } },
            { designation:  { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { department: true },
        take: 5,
      }),
      this.prisma.payslip.findMany({
        where: {
          organizationId: orgId,
          employee: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName:  { contains: q, mode: 'insensitive' } },
              { employeeCode: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        include: { employee: true, payrun: { select: { month: true, year: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 5,
      }),
      this.prisma.payrun.findMany({
        where: { organizationId: orgId, name: { contains: q, mode: 'insensitive' } },
        take: 3,
      }),
    ]);

    return { employees, payslips, payruns };
  }
}

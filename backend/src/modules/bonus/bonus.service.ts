import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
 
@Injectable()
export class BonusService {
  constructor(private prisma: PrismaService) {}
 
  private get db(): any { return this.prisma; }
 
  async getAll(orgId: string, q: any) {
    return this.db.bonus.findMany({
      where: {
        organizationId: orgId,
        ...(q.employeeId && { employeeId: q.employeeId }),
        ...(q.year  && { year:  +q.year  }),
        ...(q.month && { month: +q.month }),
      },
      include: { employee: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
 
  async create(orgId: string, dto: any) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId: orgId },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    const amount = parseFloat(dto.amount);
    if (isNaN(amount) || amount <= 0) throw new BadRequestException('Invalid amount');
 
    return this.db.bonus.create({
      data: {
        organizationId: orgId,
        employeeId:     dto.employeeId,
        amount,
        type:        dto.type        || 'PERFORMANCE',
        month:       parseInt(dto.month, 10),
        year:        parseInt(dto.year,  10),
        description: dto.description || null,
        status:      'PENDING',
      },
      include: { employee: { include: { department: true } } },
    });
  }
 
  async approve(orgId: string, id: string) {
    const bonus = await this.db.bonus.findFirst({ where: { id, organizationId: orgId } });
    if (!bonus) throw new NotFoundException('Bonus not found');
    return this.db.bonus.update({ where: { id }, data: { status: 'APPROVED' } });
  }
 
  async remove(orgId: string, id: string) {
    const bonus = await this.db.bonus.findFirst({ where: { id, organizationId: orgId } });
    if (!bonus) throw new NotFoundException('Bonus not found');
    return this.db.bonus.delete({ where: { id } });
  }
}
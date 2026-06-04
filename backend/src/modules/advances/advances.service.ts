import { NotificationHelper } from '../../common/notification.helper';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class AdvancesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any, currentUserId?: string) {
    let employeeId = query.employeeId;
    if (query.myAdvances === 'true' && currentUserId && !employeeId) {
      const emp = await this.prisma.employee.findFirst({ where: { userId: currentUserId, organizationId: orgId } });
      if (emp) employeeId = emp.id;
    }
    return this.prisma.advanceRequest.findMany({
      where: {
        employee: { organizationId: orgId },
        ...(employeeId && { employeeId }),
        ...(query.status     && { status:     query.status as any }),
      },
      include: { employee: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(orgId: string, dto: any, currentUserId?: string) {
    let emp = dto.employeeId
      ? await this.prisma.employee.findFirst({ where: { id: dto.employeeId, organizationId: orgId } })
      : currentUserId
        ? await this.prisma.employee.findFirst({ where: { userId: currentUserId, organizationId: orgId } })
        : null;
    if (!emp) throw new NotFoundException('No employee record found. Contact HR to link your account.');

    const amount = parseFloat(dto.amount);
    if (isNaN(amount) || amount <= 0) throw new BadRequestException('Invalid advance amount');

    // Default: deduct next month
    const now            = new Date();
    const nextMonth      = now.getMonth() + 2 > 12;
    const deductionMonth = dto.deductionMonth ? parseInt(dto.deductionMonth, 10) : (nextMonth ? 1  : now.getMonth() + 2);
    const deductionYear  = dto.deductionYear  ? parseInt(dto.deductionYear,  10) : (nextMonth ? now.getFullYear() + 1 : now.getFullYear());

    await NotificationHelper.notifyAdmins(this.prisma, orgId, {
      title: 'New advance request',
      message: 'An employee has requested a salary advance',
      type: 'ACTION',
      link: '/advances',
    });
    return this.prisma.advanceRequest.create({
      data: {
        employeeId:     emp.id,
        amount,
        reason:         dto.reason || null,
        status:         'PENDING',
        deductionMonth,
        deductionYear,
      },
      include: { employee: true },
    });
  }

  async approve(orgId: string, id: string, approverId: string) {
    const adv = await this.prisma.advanceRequest.findFirst({ where: { id, employee: { organizationId: orgId } } });
    if (!adv) throw new NotFoundException('Advance request not found');
    if (adv.status !== 'PENDING') throw new BadRequestException('Advance is not pending');
    return this.prisma.advanceRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
    });
  }

  async reject(orgId: string, id: string, reason: string) {
    const adv = await this.prisma.advanceRequest.findFirst({ where: { id, employee: { organizationId: orgId } } });
    if (!adv) throw new NotFoundException('Advance request not found');
    return this.prisma.advanceRequest.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
  }
}

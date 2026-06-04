import { NotificationHelper } from '../../common/notification.helper';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class ReimbursementsService {
  constructor(private prisma: PrismaService) {}

  private get db(): any { return this.prisma; }

  async findAll(orgId: string, q: any, currentUserId?: string) {
    return this.db.reimbursement.findMany({
      where: {
        organizationId: orgId,
        ...(q.status     && { status:     q.status }),
        ...(q.employeeId && { employeeId: q.employeeId }),
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
    if (isNaN(amount) || amount <= 0) throw new BadRequestException('Invalid amount');

    // Auto-set payment month: next month's payrun (approved reimbursements are added to next payrun)
    const now          = new Date();
    const nextMonth    = now.getMonth() + 2 > 12;
    const paymentMonth = nextMonth ? 1              : now.getMonth() + 2;
    const paymentYear  = nextMonth ? now.getFullYear() + 1 : now.getFullYear();

    return this.db.reimbursement.create({
      data: {
        employeeId:    emp.id,
        organizationId: orgId,
        category:      dto.category || 'Other',
        amount,
        description:   dto.description || null,
        receiptUrl:    dto.receiptUrl  || null,
        status:        'PENDING',
        paymentMonth,
        paymentYear,
      },
      include: { employee: true },
    });
  }

  async approve(orgId: string, id: string, approverId: string) {
    const r = await this.db.reimbursement.findFirst({ where: { id, organizationId: orgId } });
    if (!r) throw new NotFoundException('Reimbursement not found');
    if (r.status !== 'PENDING') throw new BadRequestException('Already processed');
    return this.db.reimbursement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
    });
  }

  async reject(orgId: string, id: string, reason: string) {
    const r = await this.db.reimbursement.findFirst({ where: { id, organizationId: orgId } });
    if (!r) throw new NotFoundException('Reimbursement not found');
    return this.db.reimbursement.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
  }

  async getStats(orgId: string) {
    const all = await this.db.reimbursement.findMany({ where: { organizationId: orgId } });
    return {
      total:       all.length,
      pending:     all.filter((r: any) => r.status === 'PENDING').length,
      approved:    all.filter((r: any) => r.status === 'APPROVED').length,
      totalAmount: all.filter((r: any) => ['APPROVED','PAID'].includes(r.status)).reduce((a: number, r: any) => a + r.amount, 0),
    };
  }
}

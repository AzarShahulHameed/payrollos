import { NotificationHelper } from '../../common/notification.helper';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any, currentUserId?: string) {
    // If myLoans=true, resolve employee from logged-in userId
    let employeeId = query.employeeId;
    if (query.myLoans === 'true' && currentUserId && !employeeId) {
      const emp = await this.prisma.employee.findFirst({ where: { userId: currentUserId, organizationId: orgId } });
      if (emp) employeeId = emp.id;
    }
    return this.prisma.loanRequest.findMany({
      where: {
        employee: { organizationId: orgId },
        ...(employeeId && { employeeId }),
        ...(query.status && { status: query.status as any }),
      },
      include: {
        employee: { include: { department: true } },
        installmentsList: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const loan = await this.prisma.loanRequest.findFirst({
      where: { id, employee: { organizationId: orgId } },
      include: { employee: true, installmentsList: { orderBy: [{ year: 'asc' }, { month: 'asc' }] } },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  async create(orgId: string, dto: any, currentUserId?: string) {
    // Resolve employee from userId if employeeId not provided (ESS self-service)
    let emp = dto.employeeId
      ? await this.prisma.employee.findFirst({ where: { id: dto.employeeId, organizationId: orgId } })
      : currentUserId
        ? await this.prisma.employee.findFirst({ where: { userId: currentUserId, organizationId: orgId } })
        : null;
    if (!emp) throw new NotFoundException('No employee record found. Contact HR to link your account.');

    const amount       = parseFloat(dto.amount);
    const installments = parseInt(dto.installments, 10);
    if (isNaN(amount) || amount <= 0)       throw new BadRequestException('Invalid loan amount');
    if (isNaN(installments) || installments < 1) throw new BadRequestException('Invalid installments');

    await NotificationHelper.notifyAdmins(this.prisma, orgId, {
      title: 'New loan request',
      message: 'An employee has applied for a salary loan',
      type: 'ACTION',
      link: '/loans',
    });
    return this.prisma.loanRequest.create({
      data: {
        employeeId:      emp.id,
        amount,
        installments,
        purpose:         dto.purpose || dto.reason || null,
        status:          'PENDING',
        remainingAmount: amount,
      },
      include: { employee: true },
    });
  }

  async approve(orgId: string, id: string, approverId: string, startMonth?: number, startYear?: number) {
    const loan = await this.findOne(orgId, id);
    if (loan.status !== 'PENDING') throw new BadRequestException('Loan is not pending');

    const emi  = Math.round((loan.amount / loan.installments) * 100) / 100;
    const now  = new Date();
    const sM   = startMonth || (now.getMonth() + 2 > 12 ? 1  : now.getMonth() + 2);
    const sY   = startYear  || (now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear());

    const data: any[] = [];
    let m = sM, y = sY;
    for (let i = 0; i < loan.installments; i++) {
      const isLast = i === loan.installments - 1;
      const amount = isLast ? Math.round((loan.amount - emi * (loan.installments - 1)) * 100) / 100 : emi;
      data.push({ loanRequestId: id, month: m, year: y, amount, status: 'PENDING' });
      m++; if (m > 12) { m = 1; y++; }
    }

    await this.prisma.loanInstallment.createMany({ data });
    const loanWithUser = await this.prisma.loanRequest.findFirst({
      where: { id, employee: { organizationId: orgId } },
      include: { employee: { include: { user: true } } },
    });
    if ((loanWithUser?.employee as any)?.user?.id) {
      await NotificationHelper.create(this.prisma, {
        userId: (loanWithUser!.employee as any).user.id,
        organizationId: orgId,
        title: 'Loan approved',
        message: 'Your loan request of ' + loanWithUser!.amount + ' has been approved. EMIs will be deducted from your salary.',
        type: 'SUCCESS',
        link: '/ess/loans',
      });
    }
    return this.prisma.loanRequest.update({
      where: { id },
      data: { status: 'ACTIVE', approvedById: approverId, approvedAt: new Date() },
      include: { installmentsList: true },
    });
  }

  async reject(orgId: string, id: string, reason: string) {
    await this.findOne(orgId, id);
    return this.prisma.loanRequest.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
  }

  async markInstallmentPaid(orgId: string, loanId: string, installmentId: string) {
    const loan = await this.findOne(orgId, loanId);
    const inst = (loan.installmentsList as any[]).find((i: any) => i.id === installmentId);
    if (!inst) throw new NotFoundException('Installment not found');
    await this.prisma.loanInstallment.update({ where: { id: installmentId }, data: { status: 'PAID', paidAt: new Date() } });
    const remaining = Math.max(0, (loan.remainingAmount || loan.amount) - inst.amount);
    return this.prisma.loanRequest.update({
      where: { id: loanId },
      data: { remainingAmount: remaining, status: remaining <= 0 ? 'CLOSED' : 'ACTIVE' },
    });
  }
}

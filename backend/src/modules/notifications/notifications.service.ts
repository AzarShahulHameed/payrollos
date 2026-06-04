import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getForUser(userId: string, orgId: string) {
    return (this.prisma as any).notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }).catch(async () => {
      // Fallback: generate notifications from real events
      return this.generateFromEvents(userId, orgId);
    });
  }

  async markRead(userId: string, id: string) {
    return (this.prisma as any).notification.update({
      where: { id, userId },
      data: { readAt: new Date() },
    }).catch(() => null);
  }

  async markAllRead(userId: string) {
    return (this.prisma as any).notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    }).catch(() => null);
  }

  async getUnreadCount(userId: string) {
    const count = await (this.prisma as any).notification.count({
      where: { userId, readAt: null },
    }).catch(() => 0);
    return { count };
  }

  private async generateFromEvents(userId: string, orgId: string) {
    const notifications: any[] = [];
    const now = new Date();

    // Pending leave approvals
    const pendingLeaves = await this.prisma.leaveRequest.count({ where: { employee: { organizationId: orgId }, status: 'PENDING' } });
    if (pendingLeaves > 0) notifications.push({ id: 'leaves', type: 'ACTION', icon: '📅', title: `${pendingLeaves} leave request${pendingLeaves > 1 ? 's' : ''} pending approval`, body: 'Review and approve or reject', createdAt: now, readAt: null, link: '/leaves' });

    // Pending loans
    const pendingLoans = await this.prisma.loanRequest.count({ where: { employee: { organizationId: orgId }, status: 'PENDING' } });
    if (pendingLoans > 0) notifications.push({ id: 'loans', type: 'ACTION', icon: '💳', title: `${pendingLoans} loan request${pendingLoans > 1 ? 's' : ''} pending`, body: 'Review loan applications', createdAt: now, readAt: null, link: '/loans' });

    // Pending reimbursements
    const pendingReimb = await (this.prisma as any).reimbursement.count({ where: { organizationId: orgId, status: 'PENDING' } }).catch(() => 0);
    if (pendingReimb > 0) notifications.push({ id: 'reimb', type: 'ACTION', icon: '🧾', title: `${pendingReimb} reimbursement${pendingReimb > 1 ? 's' : ''} pending`, body: 'Review and approve', createdAt: now, readAt: null, link: '/reimbursements' });

    // Draft payrun this month
    const draftRun = await this.prisma.payrun.findFirst({ where: { organizationId: orgId, status: 'DRAFT', year: now.getFullYear(), month: now.getMonth() + 1 } });
    if (draftRun) notifications.push({ id: 'payrun', type: 'INFO', icon: '💰', title: 'Payrun is in draft', body: `${draftRun.name} — review and submit`, createdAt: now, readAt: null, link: '/payrun' });

    // Visa/passport expiry within 30 days (UAE)
    const thirtyDays = new Date(now.getTime() + 30 * 86400000);
    const expiringVisa = await this.prisma.employee.count({ where: { organizationId: orgId, status: 'ACTIVE', visaExpiry: { lte: thirtyDays, gte: now } } }).catch(() => 0);
    if (expiringVisa > 0) notifications.push({ id: 'visa', type: 'ALERT', icon: '⚠️', title: `${expiringVisa} visa${expiringVisa > 1 ? 's' : ''} expiring within 30 days`, body: 'Renew before expiry to avoid compliance issues', createdAt: now, readAt: null, link: '/employees' });

    return notifications;
  }
}

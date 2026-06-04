import { PrismaService } from '../common/prisma/prisma.module';

let gateway: any = null;

// Called once from NotificationsModule to inject gateway
export function setNotificationGateway(gw: any) { gateway = gw; }

export class NotificationHelper {
  static async create(
    prisma: PrismaService,
    params: {
      userId: string;
      organizationId: string;
      title: string;
      message: string;
      type: 'INFO' | 'SUCCESS' | 'ACTION' | 'WARNING';
      link?: string;
    }
  ) {
    try {
      const notification = await prisma.notification.create({ data: params });
      // Push real-time via WebSocket
      if (gateway) {
        gateway.sendToUser(params.userId, {
          id:        notification.id,
          title:     params.title,
          message:   params.message,
          type:      params.type,
          link:      params.link,
          createdAt: notification.createdAt,
          read:      false,
        });
      }
      return notification;
    } catch (e: any) {
      console.error('[Notification create failed]', e.message);
      return null;
    }
  }

  static async notifyAdmins(
    prisma: PrismaService,
    orgId: string,
    params: { title: string; message: string; type: 'INFO'|'SUCCESS'|'ACTION'|'WARNING'; link?: string }
  ) {
    const admins = await prisma.user.findMany({
      where: { organizationId: orgId, role: { in: ['SUPER_ADMIN','ADMIN','HR'] as any } },
      select: { id: true },
    });
    const notifications = [];
    for (const admin of admins) {
      const n = await this.create(prisma, { ...params, userId: admin.id, organizationId: orgId });
      if (n) notifications.push(n);
    }
    // Also broadcast to admin room
    if (gateway) {
      gateway.sendToAdmins(orgId, { ...params, createdAt: new Date(), read: false });
    }
    return notifications;
  }

  static async notifyUser(
    prisma: PrismaService,
    userId: string,
    orgId: string,
    params: { title: string; message: string; type: 'INFO'|'SUCCESS'|'ACTION'|'WARNING'; link?: string }
  ) {
    return this.create(prisma, { ...params, userId, organizationId: orgId });
  }
}

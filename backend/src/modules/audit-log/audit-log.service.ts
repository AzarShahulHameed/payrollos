import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
 
@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}
 
  async findAll(orgId: string, q: any) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        ...(q.entityType && { entity: q.entityType }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, parseInt(q.limit || '100', 10)),
    });
 
    // Enrich with user info separately
    return Promise.all(logs.map(async (log) => {
      const user = log.userId
        ? await this.prisma.user.findFirst({
            where: { id: log.userId },
            select: { firstName: true, lastName: true, email: true },
          })
        : null;
      return { ...log, performedBy: user };
    }));
  }
 
  async log(orgId: string, userId: string, action: string, entityType: string, entityId: string, changes?: any) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action,
        entity: entityType,
        entityId,
        changes: changes ? changes : undefined,
      },
    });
  }
}
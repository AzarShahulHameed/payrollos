import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.module';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('pending')
  async getPending(@Request() req: any) {
    const orgId = req.user.orgId;
    const [leaves, loans, advances, reimbursements] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { employee: { organizationId: orgId }, status: 'PENDING' } }),
      this.prisma.loanRequest.count({ where: { employee: { organizationId: orgId }, status: 'PENDING' } }),
      this.prisma.advanceRequest.count({ where: { employee: { organizationId: orgId }, status: 'PENDING' } }),
      (this.prisma as any).reimbursement.count({ where: { organizationId: orgId, status: 'PENDING' } }).catch(() => 0),
    ]);
    return { leaves, loans, advances, reimbursements, total: leaves + loans + advances + reimbursements };
  }
}

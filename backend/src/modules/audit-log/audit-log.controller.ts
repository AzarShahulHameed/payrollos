import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditLogService } from './audit-log.service';
@Controller('audit-log')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(private svc: AuditLogService) {}
  @Get() findAll(@Req() req: any, @Query() q: any) { return this.svc.findAll(req.user.orgId, q); }
}

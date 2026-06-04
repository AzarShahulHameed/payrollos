import { CreateReimbursementDto } from '../../common/dto/common.dto';
import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReimbursementsService } from './reimbursements.service';
@Controller('reimbursements')
@UseGuards(JwtAuthGuard)
export class ReimbursementsController {
  constructor(private svc: ReimbursementsService) {}
  @Get() findAll(@Req() req: any, @Query() q: any) { return this.svc.findAll(req.user.orgId, q, req.user.id); }
  @Get('stats') stats(@Req() req: any) { return this.svc.getStats(req.user.orgId); }
  @Post() create(@Req() req: any, @Body() dto: CreateReimbursementDto) { return this.svc.create(req.user.orgId, dto, req.user.id); }
  @Post(':id/approve') approve(@Req() req: any, @Param('id') id: string) { return this.svc.approve(req.user.orgId, id, req.user.sub); }
  @Post(':id/reject') reject(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.svc.reject(req.user.orgId, id, b.reason); }
}

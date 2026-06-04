import { CreateLeaveDto } from '../../common/dto/common.dto';
import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeavesService } from './leaves.service';

@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeavesController {
  constructor(private readonly svc: LeavesService) {}
  @Get() findAll(@Request() req, @Query() q: any) { return this.svc.findAll(req.user.orgId, q, req.user.id); }
  @Post() create(@Request() req, @Body() dto: CreateLeaveDto) { return this.svc.create(req.user.orgId, dto, req.user.id); }
  @Post(':id/approve')
  async approve(@Request() req, @Param('id') id: string) {
    const result = await this.svc.approve(req.user.orgId, id, req.user.id);
    if (result?.employee?.email) {
      try { await (this as any).email?.sendLeaveUpdate(result.employee, result, 'APPROVED'); } catch {}
    }
    return result;
  }

  @Post(':id/reject')
  async reject(@Request() req, @Param('id') id: string, @Body() b: any) {
    const result = await this.svc.reject(req.user.orgId, id, b.reason);
    return result;
  }
  @Get(':empId/balances') getBalances(@Request() req, @Param('empId') empId: string, @Query('year') year: string) { return this.svc.getBalances(req.user.orgId, empId, +year || new Date().getFullYear()); }
  @Post(':empId/balances/init') initBalances(@Request() req, @Param('empId') empId: string, @Body() b: any) { return this.svc.initializeBalances(req.user.orgId, empId, b.year || new Date().getFullYear()); }
}

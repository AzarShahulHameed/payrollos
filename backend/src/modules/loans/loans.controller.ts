import { CreateLoanDto } from '../../common/dto/common.dto';
import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LoansService } from './loans.service';

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly svc: LoansService) {}
  @Get() findAll(@Request() req, @Query() q: any) { return this.svc.findAll(req.user.orgId, q, req.user.id); }
  @Get(':id') findOne(@Request() req, @Param('id') id: string) { return this.svc.findOne(req.user.orgId, id); }
  @Post() create(@Request() req, @Body() dto: CreateLoanDto) { return this.svc.create(req.user.orgId, dto, req.user.id); }
  @Post(':id/approve') approve(@Request() req, @Param('id') id: string, @Body() b: any) { return this.svc.approve(req.user.orgId, id, req.user.id, b.startMonth, b.startYear); }
  @Post(':id/reject') reject(@Request() req, @Param('id') id: string, @Body() b: any) { return this.svc.reject(req.user.orgId, id, b.reason); }
  @Post(':id/installments/:instId/paid') markPaid(@Request() req, @Param('id') id: string, @Param('instId') instId: string) { return this.svc.markInstallmentPaid(req.user.orgId, id, instId); }
}

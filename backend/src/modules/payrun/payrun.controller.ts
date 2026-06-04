import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PayrunService } from './payrun.service';

@Controller('payruns')
@UseGuards(JwtAuthGuard)
export class PayrunController {
  constructor(private readonly svc: PayrunService) {}

  @Get()
  findAll(@Request() req, @Query() query: any) {
    return this.svc.findAll(req.user.orgId, query);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.orgId, id);
  }

  @Post('draft')
  getOrCreateDraft(@Request() req, @Body() body: { year: number; month: number; region: string }) {
    return this.svc.getOrCreateDraft(req.user.orgId, body.year, body.month, body.region);
  }

  @Post(':id/regenerate')
  regenerate(@Request() req, @Param('id') id: string) {
    return this.svc.generatePayslips(req.user.orgId, id);
  }

  @Post(':id/submit')
  submit(@Request() req, @Param('id') id: string) {
    return this.svc.submitForReview(req.user.orgId, id);
  }

  @Post(':id/approve')
  approve(@Request() req, @Param('id') id: string) {
    return this.svc.approve(req.user.orgId, id);
  }

  @Post(':id/process')
  process(@Request() req, @Param('id') id: string) {
    return this.svc.process(req.user.orgId, id);
  }

  @Post(':id/mark-paid')
  markPaid(@Request() req, @Param('id') id: string) {
    return this.svc.markPaid(req.user.orgId, id);
  }
}

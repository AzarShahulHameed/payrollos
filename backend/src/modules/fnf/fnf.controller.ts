import { Controller, Get, Post, Param, Body, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FnfService } from './fnf.service';
import { PdfService } from '../pdf/pdf.service';

@Controller('fnf')
@UseGuards(JwtAuthGuard)
export class FnfController {
  constructor(private svc: FnfService, private pdf: PdfService) {}

  @Get('list')
  list(@Req() req: any) { return this.svc.getFnFList(req.user.orgId); }

  @Post('calculate')
  calculate(@Req() req: any, @Body() body: { employeeId: string; lastWorkingDate: string }) {
    return this.svc.calculateFnF(req.user.orgId, body.employeeId, body.lastWorkingDate);
  }

  @Post('process')
  process(@Req() req: any, @Body() body: { employeeId: string; lastWorkingDate: string }) {
    return this.svc.processFnF(req.user.orgId, body.employeeId, body.lastWorkingDate);
  }
}

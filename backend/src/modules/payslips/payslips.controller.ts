import { Controller, Get, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PayslipsService } from './payslips.service';
import { PdfService } from '../pdf/pdf.service';
import { PrismaService } from '../../common/prisma/prisma.module';

@Controller('payslips')
@UseGuards(JwtAuthGuard)
export class PayslipsController {
  constructor(
    private readonly svc: PayslipsService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Req() req: any, @Query('region') region: string, @Query('month') month: string, @Query('employeeId') employeeId: string) {
    return this.svc.list(req.user.orgId, region, month, employeeId);
  }

  @Get('my')
  my(@Req() req: any, @Query() q: any) {
    return this.svc.mySlips(req.user.id, q);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.get(id, req.user.orgId);
  }

  // PDF download endpoint
  @Get('ytd/:employeeId')
  ytd(@Param('employeeId') empId: string, @Req() req: any, @Query('year') year?: string) {
    return this.svc.getYTD(req.user.orgId, empId, year ? +year : undefined);
  }

  @Get('compare/:employeeId')
  compare(@Param('employeeId') empId: string, @Req() req: any, @Query('m1') m1: string, @Query('m2') m2: string) {
    return this.svc.compare(req.user.orgId, empId, m1, m2);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const slip = await this.svc.get(id, req.user.orgId);
    if (!slip) return res.status(404).json({ message: 'Payslip not found' });

    const org = await this.prisma.organization.findUnique({ where: { id: req.user.orgId } });
    const html = this.pdf.generatePayslipHtml(slip, org);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const name   = `Payslip-${slip.employee?.lastName}-${MONTHS[(slip.payrun?.month||1)-1]}-${slip.payrun?.year}.html`;

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    });
    res.send(html);
  }
}

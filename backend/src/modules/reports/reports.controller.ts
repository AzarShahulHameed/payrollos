import { Controller, Get, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}
  @Get('payroll-summary/:payrunId') summary(@Request() req, @Param('payrunId') id: string) { return this.svc.getPayrollSummary(req.user.orgId, id); }
  @Get('pf-esi-challan') pfEsi(@Request() req, @Query('year') y: string, @Query('month') m: string) { return this.svc.getPfEsiChallan(req.user.orgId, +y, +m); }
  @Get('wps/:payrunId') wps(@Request() req, @Param('payrunId') id: string) { return this.svc.getWpsReport(req.user.orgId, id); }
  @Get('form16/:employeeId') form16(@Request() req, @Param('employeeId') empId: string, @Query('year') y: string) { return this.svc.getForm16(req.user.orgId, empId, +y); }
  @Get('salary-register') register(@Request() req, @Query('year') y: string, @Query('month') m: string, @Query('region') r?: string) { return this.svc.getSalaryRegister(req.user.orgId, +y, +m, r); }
  @Get('bank-transfer/:payrunId')
  async bankTransfer(@Param('payrunId') id: string, @Request() req, @Res() res: any) {
    const csv = await this.svc.getBankTransferCSV(req.user.orgId, id);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="bank-transfer-${id}.csv"` });
    res.send(csv);
  }
  @Get('form24q') form24q(@Request() req, @Query('year') y: string, @Query('quarter') q: string) { return this.svc.getForm24Q(req.user.orgId, +y, +q); }
}

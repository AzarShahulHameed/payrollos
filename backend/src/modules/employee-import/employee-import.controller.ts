import { Controller, Get, Post, Body, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeeImportService } from './employee-import.service';

@Controller('employees/import')
@UseGuards(JwtAuthGuard)
export class EmployeeImportController {
  constructor(private svc: EmployeeImportService) {}

  @Get('template')
  getTemplate(@Query('region') region: string) {
    return this.svc.getTemplate(region || 'UAE');
  }

  @Get('template/download')
  downloadTemplate(@Query('region') region: string, @Res() res: Response) {
    const t = this.svc.getTemplate(region || 'UAE');
    res.set({ 'Content-Type':'text/csv', 'Content-Disposition':`attachment; filename="employee-import-${region}-template.csv"` });
    res.send(t.csv);
  }

  @Post('validate')
  validate(@Req() req: any, @Body() body: { csvContent: string; region: string }) {
    const rows = this.svc.parseCSV(body.csvContent);
    return this.svc.validateRows(rows, body.region || 'UAE');
  }

  @Post()
  async import(@Req() req: any, @Body() body: { csvContent: string; region: string }) {
    const rows = this.svc.parseCSV(body.csvContent);
    return this.svc.importEmployees(req.user.orgId, rows, body.region || 'UAE');
  }
}

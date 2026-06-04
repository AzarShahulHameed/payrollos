import { Controller, Get, Param, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WpsService } from './wps.service';

@Controller('wps')
@UseGuards(JwtAuthGuard)
export class WpsController {
  constructor(private svc: WpsService) {}

  @Get(':payrunId/report')
  report(@Req() req: any, @Param('payrunId') id: string) {
    return this.svc.getWpsReport(req.user.orgId, id);
  }

  // Returns JSON with skipped employees info
  @Get(':payrunId/preview')
  async preview(@Req() req: any, @Param('payrunId') id: string) {
    const result = await this.svc.generateSIF(req.user.orgId, id);
    return { included: result.included, skipped: result.skipped };
  }

  // Downloads the actual SIF file
  @Get(':payrunId/sif')
  async downloadSIF(@Req() req: any, @Param('payrunId') id: string, @Res() res: Response) {
    const result = await this.svc.generateSIF(req.user.orgId, id);
    if (result.skipped.length > 0) {
      // Add skipped employees as comment header in SIF
      const warning = result.skipped.map(s =>
        `# SKIPPED: ${s.name} (${s.employeeCode}) — ${s.reason}`
      ).join('\n');
      res.set({ 'Content-Type':'text/plain', 'Content-Disposition':`attachment; filename="WPS_${id}.sif"` });
      res.send(warning + '\n' + result.sif);
    } else {
      res.set({ 'Content-Type':'text/plain', 'Content-Disposition':`attachment; filename="WPS_${id}.sif"` });
      res.send(result.sif);
    }
  }
}

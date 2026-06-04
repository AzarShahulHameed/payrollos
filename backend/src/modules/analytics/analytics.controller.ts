import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
 
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}
  @Get('kpi') kpi(@Request() req, @Query('region') region?: string) { return this.svc.getKpi(req.user.orgId, region); }
  @Get('trend') trend(@Request() req, @Query('region') region?: string, @Query('months') months?: string) { return this.svc.getTrend(req.user.orgId, region, +(months||12)); }
  @Get('by-department') byDept(@Request() req, @Query('region') region?: string) { return this.svc.getByDepartment(req.user.orgId, region); }
  @Get('decompose') decompose(@Request() req, @Query('region') region?: string, @Query('payrunId') payrunId?: string) { return this.svc.getDecompositionTree(req.user.orgId, region, payrunId); }
}
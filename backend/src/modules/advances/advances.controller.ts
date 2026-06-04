import { CreateAdvanceDto } from '../../common/dto/common.dto';
import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdvancesService } from './advances.service';

@Controller('advances')
@UseGuards(JwtAuthGuard)
export class AdvancesController {
  constructor(private readonly svc: AdvancesService) {}
  @Get() findAll(@Request() req, @Query() q: any) { return this.svc.findAll(req.user.orgId, q, req.user.id); }
  @Post() create(@Request() req, @Body() dto: CreateAdvanceDto) { return this.svc.create(req.user.orgId, dto, req.user.id); }
  @Post(':id/approve') approve(@Request() req, @Param('id') id: string) { return this.svc.approve(req.user.orgId, id, req.user.id); }
  @Post(':id/reject') reject(@Request() req, @Param('id') id: string, @Body() b: any) { return this.svc.reject(req.user.orgId, id, b.reason); }
}

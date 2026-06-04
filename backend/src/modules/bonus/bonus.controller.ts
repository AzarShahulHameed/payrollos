import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BonusService } from './bonus.service';
@Controller('bonus')
@UseGuards(JwtAuthGuard)
export class BonusController {
  constructor(private svc: BonusService) {}
  @Get()               getAll(@Request() req, @Query() q: any)            { return this.svc.getAll(req.user.orgId, q); }
  @Post()              create(@Request() req, @Body() dto: any)            { return this.svc.create(req.user.orgId, dto); }
  @Patch(':id/approve')approve(@Request() req, @Param('id') id: string)   { return this.svc.approve(req.user.orgId, id); }
  @Delete(':id')       remove(@Request() req, @Param('id') id: string)    { return this.svc.remove(req.user.orgId, id); }
}

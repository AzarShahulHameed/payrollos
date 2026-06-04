import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ArrearsService } from './arrears.service';
@Controller('arrears')
@UseGuards(JwtAuthGuard)
export class ArrearsController {
  constructor(private svc: ArrearsService) {}
  @Post('calculate') calculate(@Req() req: any, @Body() body: any) { return this.svc.calculateArrears(req.user.orgId, body.employeeId, body); }
  @Post('apply')     apply(@Req() req: any, @Body() body: any)     { return this.svc.applyArrears(req.user.orgId, body.employeeId, body); }
}

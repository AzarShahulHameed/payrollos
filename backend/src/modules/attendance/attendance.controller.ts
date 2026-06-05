import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private svc: AttendanceService) {}

  @Get('summary')
  summary(@Req() req: any, @Query('year') y: string, @Query('month') m: string) {
    return this.svc.getSummary(req.user.orgId, +y || new Date().getFullYear(), +m || new Date().getMonth() + 1);
  }

  @Get('monthly')
  monthly(@Req() req: any, @Query('year') y: string, @Query('month') m: string, @Query('employeeId') empId?: string) {
    return this.svc.getMonthlyAttendance(req.user.orgId, +y, +m, empId);
  }

  @Get('employee/:id')
  employee(@Req() req: any, @Param('id') id: string, @Query('year') y: string, @Query('month') m: string) {
    return this.svc.getEmployeeAttendance(req.user.orgId, id, +y, +m);
  }

  @Post('mark')
  mark(@Req() req: any, @Body() dto: any) {
    return this.svc.markAttendance(req.user.orgId, dto);
  }

  @Post('bulk')
  bulk(@Req() req: any, @Body() body: { records: any[] }) {
    return this.svc.bulkMark(req.user.orgId, body.records);
  }

  // ESS: clock in as the logged-in employee
  @Post('clock-in')
  clockIn(@Req() req: any) {
    return this.svc.clockIn(req.user.orgId, req.user.id);
  }

  // ESS: clock out as the logged-in employee
  @Post('clock-out')
  clockOut(@Req() req: any) {
    return this.svc.clockOut(req.user.orgId, req.user.id);
  }

  // ESS: get my own attendance
  @Get('my')
  myAttendance(@Req() req: any, @Query('year') y: string, @Query('month') m: string) {
    const year  = +y || new Date().getFullYear();
    const month = +m || new Date().getMonth() + 1;
    return this.svc.getMyAttendance(req.user.orgId, req.user.id, year, month);
  }
}

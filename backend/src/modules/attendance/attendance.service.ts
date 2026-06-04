import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
 
// NOTE: Attendance model will be available after running:
// npx prisma migrate dev --name add-attendance-reimbursements
// npx prisma generate
 
@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}
 
  private get db(): any { return this.prisma; }
 
  async getMonthlyAttendance(orgId: string, year: number, month: number, employeeId?: string) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0);
    return this.db.attendance.findMany({
      where: { organizationId: orgId, date: { gte: start, lte: end }, ...(employeeId && { employeeId }) },
      include: { employee: { select: { id:true, firstName:true, lastName:true, employeeCode:true, designation:true, photoUrl:true, department:{ select:{ name:true } } } } },
      orderBy: [{ date:'asc' }],
    });
  }
 
  async getEmployeeAttendance(orgId: string, empId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0);
    const records = await this.db.attendance.findMany({
      where: { organizationId: orgId, employeeId: empId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
    const summary = {
      present:    records.filter((r: any) => r.status === 'PRESENT').length,
      absent:     records.filter((r: any) => r.status === 'ABSENT').length,
      halfDay:    records.filter((r: any) => r.status === 'HALF_DAY').length,
      late:       records.filter((r: any) => r.status === 'LATE').length,
      onLeave:    records.filter((r: any) => r.status === 'ON_LEAVE').length,
      holiday:    records.filter((r: any) => r.status === 'HOLIDAY').length,
      totalHours: records.reduce((a: number, r: any) => a + (r.hoursWorked || 0), 0),
      lopDays:    records.filter((r: any) => r.status === 'ABSENT').length +
                  records.filter((r: any) => r.status === 'HALF_DAY').length * 0.5,
    };
    return { records, summary };
  }
 
  // Parse checkIn/checkOut — accepts full ISO string OR HH:MM time string
  private parseTime(date: string, timeOrIso?: string): Date | null {
    if (!timeOrIso) return null;
    // If it's already a full ISO string (contains T and Z)
    if (timeOrIso.includes('T')) {
      const d = new Date(timeOrIso);
      return isNaN(d.getTime()) ? null : d;
    }
    // Otherwise treat as HH:MM
    const d = new Date(`${date}T${timeOrIso}`);
    return isNaN(d.getTime()) ? null : d;
  }
 
  async markAttendance(orgId: string, dto: {
    employeeId?: string; userId?: string; date: string; status: string;
    checkIn?: string; checkOut?: string; notes?: string;
  }) {
    // Resolve employeeId — either passed directly or looked up from userId
    let employeeId = dto.employeeId;
    if (!employeeId && dto.userId) {
      const emp = await this.prisma.employee.findFirst({ where: { userId: dto.userId, organizationId: orgId } });
      if (!emp) throw new NotFoundException('No employee record linked to this user');
      employeeId = emp.id;
    }
    if (!employeeId) throw new NotFoundException('Employee ID required');
 
    const emp = await this.prisma.employee.findFirst({ where: { id: employeeId, organizationId: orgId } });
    if (!emp) throw new NotFoundException('Employee not found');
 
    const date   = new Date(dto.date.split('T')[0] + 'T00:00:00.000Z');
    const checkIn  = this.parseTime(dto.date.split('T')[0], dto.checkIn);
    const checkOut = this.parseTime(dto.date.split('T')[0], dto.checkOut);
    const hoursWorked: number | null = (checkIn && checkOut)
      ? Math.max(0, (checkOut.getTime() - checkIn.getTime()) / 3600000)
      : null;  // null not undefined — Prisma rejects undefined
 
    return this.db.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { employeeId, date, status: dto.status, checkIn, checkOut, hoursWorked, notes: dto.notes || null, source: 'MANUAL', organizationId: orgId },
      update: { status: dto.status, checkIn, checkOut, hoursWorked, notes: dto.notes || null },
    });
  }
 
  // Dedicated ESS clock-in: looks up employee from userId automatically
  async clockIn(orgId: string, userId: string) {
    const emp = await this.prisma.employee.findFirst({ where: { userId, organizationId: orgId } });
    if (!emp) throw new NotFoundException(
      'Your user account is not linked to an employee record. Ask your HR administrator to link your account in the Employees page.'
    );
    const today = new Date().toISOString().split('T')[0];
    const date  = new Date(today + 'T00:00:00.000Z');
    // Check if already clocked in today
    const existing = await this.db.attendance.findFirst({ where: { employeeId: emp.id, date } });
    if (existing?.checkIn && !existing?.checkOut) {
      throw new Error('You are already clocked in. Please clock out first.');
    }
    if (existing?.checkOut) {
      throw new Error('You have already completed attendance for today.');
    }
    return this.db.attendance.upsert({
      where: { employeeId_date: { employeeId: emp.id, date } },
      create: { employeeId: emp.id, date, status: 'PRESENT', checkIn: new Date(), checkOut: null, hoursWorked: null, notes: null, source: 'MANUAL', organizationId: orgId },
      update: { status: 'PRESENT', checkIn: new Date(), checkOut: null },
    });
  }
 
  async clockOut(orgId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const emp = await this.prisma.employee.findFirst({ where: { userId, organizationId: orgId } });
    if (!emp) throw new NotFoundException('No employee record linked to this user');
 
    const existing = await this.db.attendance.findFirst({
      where: { employeeId: emp.id, date: new Date(today + 'T00:00:00.000Z') },
    });
    if (!existing) throw new NotFoundException('No clock-in record found for today');
 
    const checkOut = new Date();
    const hoursWorked = existing.checkIn
      ? Math.max(0, (checkOut.getTime() - new Date(existing.checkIn).getTime()) / 3600000)
      : null;
 
    return this.db.attendance.update({
      where: { id: existing.id },
      data: { checkOut, hoursWorked, status: 'PRESENT' },
    });
  }
 
  async getMyAttendance(orgId: string, userId: string, year: number, month: number) {
    const emp = await this.prisma.employee.findFirst({ where: { userId, organizationId: orgId } });
    if (!emp) return { records: [], summary: { present:0,absent:0,halfDay:0,late:0,onLeave:0,holiday:0,totalHours:0,lopDays:0 } };
    return this.getEmployeeAttendance(orgId, emp.id, year, month);
  }
 
  async bulkMark(orgId: string, records: any[]) {
    const results = await Promise.allSettled(records.map((r: any) => this.markAttendance(orgId, r)));
    return { success: results.filter(r => r.status === 'fulfilled').length, failed: results.filter(r => r.status === 'rejected').length, total: records.length };
  }
 
  async getSummary(orgId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0);
    const [employees, attendance] = await Promise.all([
      this.prisma.employee.findMany({ where: { organizationId: orgId, status: 'ACTIVE' }, select: { id:true, firstName:true, lastName:true, employeeCode:true, photoUrl:true, department:{ select:{ name:true } } } }),
      this.db.attendance.findMany({ where: { organizationId: orgId, date: { gte: start, lte: end } } }),
    ]);
    return employees.map((emp: any) => {
      const recs = attendance.filter((a: any) => a.employeeId === emp.id);
      return { employee: emp, present: recs.filter((r: any) => r.status === 'PRESENT').length, absent: recs.filter((r: any) => r.status === 'ABSENT').length, halfDay: recs.filter((r: any) => r.status === 'HALF_DAY').length, late: recs.filter((r: any) => r.status === 'LATE').length, onLeave: recs.filter((r: any) => r.status === 'ON_LEAVE').length, lopDays: recs.filter((r: any) => r.status === 'ABSENT').length + recs.filter((r: any) => r.status === 'HALF_DAY').length * 0.5, totalHours: recs.reduce((a: number, r: any) => a + (r.hoursWorked || 0), 0) };
    });
  }
}
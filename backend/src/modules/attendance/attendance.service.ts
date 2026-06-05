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
  async clockIn(orgId: string, userId: string, dto: {
    locationType: 'OFFICE'|'REMOTE'|'HOME';
    latitude?: number;
    longitude?: number;
    wifiIp?: string;
  }) {
    const emp = await this.prisma.employee.findFirst({
      where: { userId, organizationId: orgId },
      include: { branch: true },
    });
    if (!emp) throw new NotFoundException(
      'Your user account is not linked to an employee record. Ask your HR administrator to link your account in the Employees page.'
    );

    const today = new Date().toISOString().split('T')[0];
    const date  = new Date(today + 'T00:00:00.000Z');

    const existing = await this.db.attendance.findFirst({ where: { employeeId: emp.id, date } });
    if (existing?.checkIn && !existing?.checkOut) throw new Error('You are already clocked in.');
    if (existing?.checkOut) throw new Error('You have already completed attendance for today.');

    // Validate office location
    let geoValidated = false;
    let ipValidated  = false;

    if (dto.locationType === 'OFFICE' && emp.branch) {
      const branch = emp.branch as any;
      // GPS validation
      if (branch.latitude && branch.longitude && dto.latitude && dto.longitude) {
        const dist = this.haversineDistance(dto.latitude, dto.longitude, branch.latitude, branch.longitude);
        geoValidated = dist <= (branch.radiusMetres || 100);
      }
      // IP validation
      if (branch.allowedIps && dto.wifiIp) {
        const allowed = branch.allowedIps.split(',').map((ip: string) => ip.trim());
        ipValidated = allowed.some((ip: string) => dto.wifiIp!.startsWith(ip));
      }
    }

    return this.db.attendance.upsert({
      where: { employeeId_date: { employeeId: emp.id, date } },
      create: {
        employeeId: emp.id, date, status: 'PRESENT',
        checkIn: new Date(), checkOut: null, hoursWorked: null,
        notes: null, source: 'ESS', organizationId: orgId,
        locationType: dto.locationType,
        latitude: dto.latitude, longitude: dto.longitude,
        wifiIp: dto.wifiIp,
        geoValidated, ipValidated,
      },
      update: {
        status: 'PRESENT', checkIn: new Date(), checkOut: null,
        locationType: dto.locationType,
        latitude: dto.latitude, longitude: dto.longitude,
        wifiIp: dto.wifiIp,
        geoValidated, ipValidated,
      },
    });
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in metres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2)
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  async clockOut(orgId: string, userId: string, opeEntries: any[] = []) {
    const today = new Date().toISOString().split('T')[0];
    const emp   = await this.prisma.employee.findFirst({ where: { userId, organizationId: orgId } });
    if (!emp) throw new NotFoundException('No employee record linked to this user');

    const existing = await this.db.attendance.findFirst({
      where: { employeeId: emp.id, date: new Date(today + 'T00:00:00.000Z') },
    });
    if (!existing) throw new NotFoundException('No clock-in record found for today');

    const checkOut   = new Date();
    const hoursWorked = existing.checkIn
      ? Math.max(0, (checkOut.getTime() - new Date(existing.checkIn).getTime()) / 3600000)
      : null;

    await this.db.attendance.update({
      where: { id: existing.id },
      data: { checkOut, hoursWorked, status: 'PRESENT' },
    });

    // Save OPE entries
    if (opeEntries.length > 0) {
      await (this.prisma as any).opeEntry.createMany({
        data: opeEntries.map((e: any) => ({
          attendanceId: existing.id,
          opeTypeId:    e.opeTypeId,
          amount:       e.amount,
          billUrl:      e.billUrl || null,
          remarks:      e.remarks || null,
        })),
      });
    }

    return this.db.attendance.findUnique({
      where: { id: existing.id },
      include: { opeEntries: { include: { opeType: true } } },
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

  async getOpeTypes(orgId: string) {
    return (this.prisma as any).opeType.findMany({
      where: { organizationId: orgId, active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getLiveAttendance(orgId: string) {
    const today = new Date().toISOString().split('T')[0];
    const records = await (this.prisma as any).attendance.findMany({
      where: {
        organizationId: orgId,
        date: new Date(today + 'T00:00:00.000Z'),
        checkIn: { not: null },
      },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true,
            designation: true, photoUrl: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });
    return records.map((r: any) => ({
      ...r,
      // Only include geo data — admins will see it, employees won't
      isActive: !!r.checkIn && !r.checkOut,
      hoursToday: r.checkIn && !r.checkOut
        ? Math.max(0, (new Date().getTime() - new Date(r.checkIn).getTime()) / 3600000)
        : r.hoursWorked,
    }));
  }

}
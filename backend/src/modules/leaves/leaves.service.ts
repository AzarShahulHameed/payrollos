import { NotificationHelper } from '../../common/notification.helper';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

const LEAVE_TYPES_UAE   = ['ANNUAL','SICK','MATERNITY','PATERNITY','UNPAID'];
const LEAVE_TYPES_INDIA = ['ANNUAL','SICK','CASUAL','MATERNITY','PATERNITY','UNPAID'];

// Paid leave types (not LOP)
const PAID_TYPES = ['ANNUAL','SICK','CASUAL','MATERNITY','PATERNITY'];

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any, currentUserId?: string) {
    // If myLeaves=true, only return leaves for the current user's employee record
    let employeeId = query.employeeId;
    if (query.myLeaves === 'true' && currentUserId) {
      const emp = await this.prisma.employee.findFirst({ where: { userId: currentUserId, organizationId: orgId } });
      if (emp) employeeId = emp.id;
    }
    return this.prisma.leaveRequest.findMany({
      where: {
        employee: { organizationId: orgId },
        ...(query.status && { status: query.status }),
        ...(employeeId   && { employeeId }),
        ...(query.leaveType && { leaveType: query.leaveType }),
      },
      include: { employee: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(orgId: string, dto: any, currentUserId?: string) {
    let emp;
    if (dto.employeeId) {
      emp = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, organizationId: orgId } });
    } else if (currentUserId) {
      // ESS: find employee by current user
      emp = await this.prisma.employee.findFirst({ where: { userId: currentUserId, organizationId: orgId } });
    }
    if (!emp) throw new NotFoundException('Employee not found');
    dto.employeeId = emp.id;

    const startDate = new Date(dto.startDate);
    const endDate   = new Date(dto.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new BadRequestException('Invalid dates');
    if (endDate < startDate) throw new BadRequestException('End date must be after start date');

    const days    = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    const isPaid  = PAID_TYPES.includes(dto.leaveType);
    const year    = startDate.getFullYear();

    // Check balance only for paid leave types
    if (isPaid && dto.leaveType !== 'MATERNITY' && dto.leaveType !== 'PATERNITY') {
      const balance = await this.prisma.leaveBalance.findFirst({
        where: { employeeId: dto.employeeId, leaveType: dto.leaveType, year },
      });
      if (balance && balance.remaining < days) {
        throw new BadRequestException(`Insufficient leave balance. Available: ${balance.remaining} days, Requested: ${days} days`);
      }
    }

    // Notify HR/Admin
    await NotificationHelper.notifyAdmins(this.prisma, orgId, {
      title: 'New leave request',
      message: 'An employee has submitted a leave request for approval',
      type: 'ACTION',
      link: '/leaves',
    });

    return this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        leaveType:  dto.leaveType,
        startDate,
        endDate,
        days,
        isPaid,
        reason:     dto.reason || null,
        status:     'PENDING',
      },
      include: { employee: { include: { department: true } } },
    });
  }

  async approve(orgId: string, id: string, approverId: string) {
    const req = await this.prisma.leaveRequest.findFirst({ where: { id, employee: { organizationId: orgId } } });
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.status !== 'PENDING') throw new BadRequestException('Leave request is not pending');

    // Deduct from leave balance
    if (req.isPaid) {
      const balance = await this.prisma.leaveBalance.findFirst({
        where: { employeeId: req.employeeId, leaveType: req.leaveType, year: req.startDate.getFullYear() },
      });
      if (balance && balance.remaining >= req.days) {
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { used: balance.used + req.days, remaining: balance.remaining - req.days },
        });
      }
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
      include: { employee: true },
    });
  }

  async reject(orgId: string, id: string, reason: string) {
    const req = await this.prisma.leaveRequest.findFirst({ where: { id, employee: { organizationId: orgId } } });
    if (!req) throw new NotFoundException('Leave request not found');
    return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
  }

  async getBalances(orgId: string, empId: string, year: number) {
    const emp = await this.prisma.employee.findFirst({ where: { id: empId, organizationId: orgId } });
    if (!emp) throw new NotFoundException('Employee not found');
    return this.prisma.leaveBalance.findMany({ where: { employeeId: empId, year } });
  }

  async initializeBalances(orgId: string, empId: string, year: number) {
    const emp = await this.prisma.employee.findFirst({ where: { id: empId, organizationId: orgId }, include: { organization: true } });
    if (!emp) throw new NotFoundException('Employee not found');

    const region    = emp.region;
    const types     = region === 'UAE' ? LEAVE_TYPES_UAE : LEAVE_TYPES_INDIA;
    const entitlement: Record<string, number> = {
      ANNUAL: region === 'UAE' ? 30 : 21,
      SICK:   region === 'UAE' ? 90 : 10,
      CASUAL: 7,
      MATERNITY: region === 'UAE' ? 90 : 182,
      PATERNITY: region === 'UAE' ? 5  : 15,
      UNPAID: 365,
    };

    const results = [];
    for (const lt of types) {
      const existing = await this.prisma.leaveBalance.findFirst({ where: { employeeId: empId, leaveType: lt, year } });
      if (!existing) {
        const entitled = entitlement[lt] || 0;
        results.push(await this.prisma.leaveBalance.create({
          data: { employeeId: empId, leaveType: lt, year, total: entitled, used: 0, remaining: entitled },
        }));
      }
    }
    return results;
  }
}

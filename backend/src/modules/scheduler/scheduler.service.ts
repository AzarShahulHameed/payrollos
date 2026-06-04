import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.module';
import { EmailService } from '../email/email.service';
 
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(private prisma: PrismaService, private email: EmailService) {}
 
  @Cron('0 9 * * *')
  async sendPayrunReminders() {
    this.logger.log('Checking payrun reminders…');
    const now = new Date();
    const settings = await this.prisma.payrollSettings.findMany();
 
    for (const s of settings) {
      const daysLeft = (s.payDay || 28) - now.getDate();
      if (daysLeft !== 5 && daysLeft !== 2) continue;
 
      // Find an admin user for this org separately
      const admin = await this.prisma.user.findFirst({
        where: {
          organizationId: s.organizationId,
          role: { in: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
        },
        select: { email: true },
      });
      if (!admin) continue;
 
      const org = await this.prisma.organization.findUnique({
        where: { id: s.organizationId },
        select: { name: true },
      });
      if (!org) continue;
 
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
      await this.email.sendPayrunReminder(admin.email, org.name, period, daysLeft).catch(() => {});
    }
  }
 
  @Cron('0 6 1 1 *')
  async initYearlyLeaveBalances() {
    this.logger.log('Initializing yearly leave balances…');
    const yr  = new Date().getFullYear();
    const emps = await this.prisma.employee.findMany({ where: { status: 'ACTIVE' } });
    for (const emp of emps) {
      const types: [string, number][] = emp.region === 'UAE'
        ? [['ANNUAL',30],['SICK',90],['MATERNITY',90],['PATERNITY',5]]
        : [['ANNUAL',21],['SICK',10],['CASUAL',7],['MATERNITY',182],['PATERNITY',15]];
      for (const [lt, total] of types) {
        const existing = await this.prisma.leaveBalance.findFirst({
          where: { employeeId: emp.id, leaveType: lt, year: yr },
        });
        if (!existing) {
          await this.prisma.leaveBalance.create({
            data: { employeeId: emp.id, leaveType: lt, year: yr, total, used: 0, remaining: total },
          }).catch(() => {});
        }
      }
    }
    this.logger.log('Leave balances initialized');
  }
}
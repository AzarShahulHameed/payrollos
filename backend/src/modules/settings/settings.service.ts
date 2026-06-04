import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService, private email: EmailService) {}

  async getSettings(orgId: string) {
    let settings = await this.prisma.payrollSettings.findUnique({
      where: { organizationId: orgId },
    });
    if (!settings) {
      settings = await this.prisma.payrollSettings.create({
        data: {
          organizationId: orgId,
          defaultWorkingDays: 22,
          payDay: 28,
          currency: 'AED',
          region: 'UAE',
          pfEnabled: true,
          pfEmployeePct: 12,
          pfEmployerPct: 12,
          pfWageCeiling: 15000,
          esiEnabled: true,
          esiEmployeePct: 0.75,
          esiEmployerCeiling: 21000,
          ptEnabled: true,
          lwfEnabled: false,
          lwfState: 'TAMIL_NADU',
          taxRegime: 'NEW',
          wpsEnabled: true,
          gratuityEnabled: true,
          leaveTypes: [
            { type: 'ANNUAL', name: 'Annual Leave', days: 30, isPaid: true },
            { type: 'SICK', name: 'Sick Leave', days: 15, isPaid: true },
            { type: 'CASUAL', name: 'Casual Leave', days: 7, isPaid: true },
            { type: 'MATERNITY', name: 'Maternity Leave', days: 90, isPaid: true },
            { type: 'PATERNITY', name: 'Paternity Leave', days: 5, isPaid: true },
          ],
          salaryComponents: [
            { name: 'Basic Salary', type: 'EARNING', isTaxable: true, isFixed: true },
            { name: 'HRA', type: 'EARNING', isTaxable: false, isFixed: true },
            { name: 'Transport Allowance', type: 'EARNING', isTaxable: true, isFixed: true },
            { name: 'Medical Allowance', type: 'EARNING', isTaxable: false, isFixed: false },
            { name: 'Special Allowance', type: 'EARNING', isTaxable: true, isFixed: false },
            { name: 'Performance Bonus', type: 'EARNING', isTaxable: true, isFixed: false },
          ],
        },
      });
    }
    return settings;
  }

  async updateSettings(orgId: string, dto: any) {
    // Strip any fields not in PayrollSettings schema
    const allowed = [
      'region','currency','payDay','defaultWorkingDays','overtimeEnabled','overtimeMultiplier',
      'pfEnabled','pfEmployeePct','pfEmployerPct','pfWageCeiling',
      'esiEnabled','esiEmployeePct','esiEmployerCeiling',
      'ptEnabled','lwfEnabled','lwfState','taxRegime',
      'wpsEnabled','gratuityEnabled','gpssaEnabled',
      'bankName','wpsRoutingCode',
      'maxLoanAmount','maxInstallments','maxAdvanceAmount',
      'notifyPayrunDraft','notifyPayrunApproved','notifyPayslipReleased','notifyLeaveApproval','notifyLoanApproval',
      'salaryComponents',
      'leaveTypes','salaryComponents',
    ];
    const safe: any = {};
    for (const k of allowed) { if (dto[k] !== undefined) safe[k] = dto[k]; }
    return this.prisma.payrollSettings.upsert({
      where: { organizationId: orgId },
      create: { ...safe, organizationId: orgId },
      update: safe,
    });
  }

  async getOrganization(orgId: string) {
    return this.prisma.organization.findUnique({ where: { id: orgId } });
  }

  async updateOrganization(orgId: string, dto: any) {
    // Only update known Organization fields — prevents Prisma P2009 on extra fields
    const { name, email, phone, address, website, taxId, industry, logoUrl } = dto;
    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(name      !== undefined && { name }),
        ...(email     !== undefined && { email }),
        ...(phone     !== undefined && { phone }),
        ...(address   !== undefined && { address }),
        ...(website   !== undefined && { website }),
        ...(taxId     !== undefined && { taxId }),
        ...(industry  !== undefined && { industry }),
        ...(logoUrl   !== undefined && { logoUrl }),
      },
    });
  }

  async getDepartments(orgId: string) {
    return this.prisma.department.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(orgId: string, dto: any) {
    if (!dto.name?.trim()) throw new BadRequestException('Department name is required');
    // Check for duplicate
    const existing = await this.prisma.department.findFirst({ where: { name: dto.name.trim(), organizationId: orgId } });
    if (existing) throw new BadRequestException('A department with this name already exists');
    return this.prisma.department.create({
      data: { name: dto.name.trim(), organizationId: orgId },
      include: { _count: { select: { employees: true } } },
    });
  }

  async updateDepartment(orgId: string, id: string, dto: any) {
    const dept = await this.prisma.department.findFirst({ where: { id, organizationId: orgId } });
    if (!dept) throw new NotFoundException('Department not found');
    if (!dto.name?.trim()) throw new BadRequestException('Department name is required');
    return this.prisma.department.update({
      where: { id },
      data: { name: dto.name.trim() },
      include: { _count: { select: { employees: true } } },
    });
  }

  async deleteDepartment(orgId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { employees: true } } },
    });
    if (!dept) throw new NotFoundException('Department not found');
    if ((dept as any)._count.employees > 0)
      throw new BadRequestException('Cannot delete a department that has employees. Reassign employees first.');
    return this.prisma.department.delete({ where: { id } });
  }

  async getUsers(orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, lastLoginAt: true },
    });
  }

  async inviteUser(orgId: string, dto: any) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });

    // Generate secure temp password
    const tempPassword = Array.from({ length: 10 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 56)]
    ).join('');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: { ...dto, organizationId: orgId, passwordHash, mustChangePassword: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    // Send professional welcome email
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    await this.email.sendWelcome({
      firstName: dto.firstName,
      email:     dto.email,
      orgName:   org?.name || 'Your Organisation',
      tempPassword,
      loginUrl:  `${appUrl}/login`,
    }).catch(e => console.error('Welcome email failed:', e.message));

    return user;
  }

  async updateUserRole(orgId: string, userId: string, role: string) {
    const validRoles = ['SUPER_ADMIN','ADMIN','HR','MANAGER','ACCOUNTANT','EMPLOYEE'];
    if (!validRoles.includes(role)) throw new Error('Invalid role');
    return this.prisma.user.update({ where: { id: userId, organizationId: orgId }, data: { role: role as any } });
  }

  async removeUser(orgId: string, userId: string) {
    // Don't allow removing yourself or last admin
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
    if (!user) throw new Error('User not found');
    if (user.role === 'SUPER_ADMIN') throw new Error('Cannot remove Super Admin');
    return this.prisma.user.delete({ where: { id: userId } });
  }

}

import { NotificationHelper } from '../../common/notification.helper';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
import { Prisma, Region } from '@prisma/client';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async findAll(orgId: string, query: any) {
    const region     = query.region as string | undefined;
    const search     = query.search as string | undefined;
    const departmentId = query.departmentId as string | undefined;
    const page       = Math.max(1, parseInt(query.page  || '1',  10));
    const limit      = Math.min(100, parseInt(query.limit || '50', 10));
    const skip       = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {
      organizationId: orgId,
      ...(region && { region: region as Region }),
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { firstName:    { contains: search, mode: 'insensitive' } },
          { lastName:     { contains: search, mode: 'insensitive' } },
          { employeeCode: { contains: search, mode: 'insensitive' } },
          { email:        { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where, skip, take: limit,
        include: { department: true, salaryStructure: true },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(orgId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, organizationId: orgId },
      include: { department: true, salaryStructure: true, documents: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async create(orgId: string, dto: any) {
    const count = await this.prisma.employee.count({ where: { organizationId: orgId } });
    const code  = dto.employeeCode || `EMP-${String(count + 1).padStart(4, '0')}`;

    const existing = await this.prisma.employee.findFirst({
      where: { organizationId: orgId, employeeCode: code },
    });
    if (existing) throw new BadRequestException('Employee code already exists');

    const { salaryStructure, ...empData } = dto;

    // Convert date string "YYYY-MM-DD" → ISO DateTime
    const joiningDate = empData.joiningDate
      ? new Date(empData.joiningDate + (empData.joiningDate.length === 10 ? 'T00:00:00.000Z' : ''))
      : new Date();

    // Strip empty strings for optional fields
    const clean: any = {};
    for (const [k, v] of Object.entries(empData)) {
      if (v !== '' && v !== null && v !== undefined) clean[k] = v;
    }

    const created = await this.prisma.employee.create({
      data: {
        ...clean,
        joiningDate,
        employeeCode: code,
        organizationId: orgId,
        ...(salaryStructure && Object.keys(salaryStructure).length > 0 && {
          salaryStructure: {
            create: {
              ...salaryStructure,
              organizationId: orgId,
              ctcAnnual:  salaryStructure.ctcAnnual  ? parseFloat(salaryStructure.ctcAnnual)  : undefined,
              basicPct:   salaryStructure.basicPct   ? parseFloat(salaryStructure.basicPct)   : 40,
              hraPct:     salaryStructure.hraPct     ? parseFloat(salaryStructure.hraPct)     : 50,
              basicSalary:       salaryStructure.basicSalary       ? parseFloat(salaryStructure.basicSalary)       : undefined,
              housingAllowance:  salaryStructure.housingAllowance  ? parseFloat(salaryStructure.housingAllowance)  : undefined,
              transportAllowance:salaryStructure.transportAllowance? parseFloat(salaryStructure.transportAllowance): undefined,
              medicalAllowance:  salaryStructure.medicalAllowance  ? parseFloat(salaryStructure.medicalAllowance)  : undefined,
              otherAllowances:   salaryStructure.otherAllowances   ? parseFloat(salaryStructure.otherAllowances)   : undefined,
            },
          },
        }),
      },
      include: { department: true, salaryStructure: true },
    });

    // Auto-initialize leave balances for new employee
    const yr = new Date().getFullYear();
    const leaveTypes: [string,number][] = created.region === 'UAE'
      ? [['ANNUAL',30],['SICK',90],['MATERNITY',90],['PATERNITY',5],['UNPAID',365]]
      : [['ANNUAL',21],['SICK',10],['CASUAL',7],['MATERNITY',182],['PATERNITY',15],['UNPAID',365]];
    for (const [lt, total] of leaveTypes) {
      await this.prisma.leaveBalance.create({
        data: { employeeId: created.id, leaveType: lt, year: yr, total, used: 0, remaining: total },
      }).catch(() => {});
    }

    // ── Auto-create user account + send welcome email ──────────
    // Only if employee has an email and no user account exists yet
    if (created.email) {
      try {
        // Check if user already exists with this email
        const existingUser = await this.prisma.user.findFirst({
          where: { email: created.email, organizationId: orgId },
        });

        if (!existingUser) {
          // Generate secure temp password
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
          const tempPassword = Array.from({ length: 10 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
          ).join('');
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          // Get org details for welcome email
          const org = await this.prisma.organization.findUnique({
            where: { id: orgId },
            select: { name: true },
          });

          // Create user with EMPLOYEE role
          const newUser = await (this.prisma.user as any).create({
            data: {
              firstName:         created.firstName,
              lastName:          created.lastName,
              email:             created.email,
              passwordHash,
              role:              'EMPLOYEE' as any,
              organizationId:    orgId,
              mustChangePassword: true,
            },
          });

          // Link employee record to user
          await this.prisma.employee.update({
            where: { id: created.id },
            data: { userId: newUser.id },
          });

          // Send Bayzat-style welcome email
          const appUrl = process.env.APP_URL || 'http://localhost:3000';
          await this.email.sendWelcome({
            firstName:    created.firstName,
            email:        created.email,
            orgName:      org?.name || 'Your Organisation',
            tempPassword,
            loginUrl:     `${appUrl}/login`,
          }).catch(e => console.error('[Welcome email failed]', e.message));

          // Notify admins of new employee
          await NotificationHelper.notifyAdmins(this.prisma, orgId, {
            title: 'New employee added',
            message: `${created.firstName} ${created.lastName} has been added as ${created.designation||'employee'}`,
            type: 'INFO',
            link: '/employees',
          });
        } else {
          // User exists — just link them to the employee record
          await this.prisma.employee.update({
            where: { id: created.id },
            data: { userId: existingUser.id },
          });
        }
      } catch (e: any) {
        // Don't fail the whole employee creation if user setup fails
        console.error('[Auto-user-creation failed]', e.message);
      }
    }

    return created;
  }

  async update(orgId: string, id: string, dto: any) {
    await this.findOne(orgId, id);
    const { salaryStructure, ...empData } = dto;

    const joiningDate = empData.joiningDate
      ? new Date(empData.joiningDate + (empData.joiningDate.length === 10 ? 'T00:00:00.000Z' : ''))
      : undefined;

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...empData,
        ...(joiningDate && { joiningDate }),
        ...(salaryStructure && {
          salaryStructure: {
            upsert: {
              create: { ...salaryStructure, organizationId: orgId },
              update: salaryStructure,
            },
          },
        }),
      },
      include: { department: true, salaryStructure: true },
    });
  }

  async updatePhoto(orgId: string, id: string, photoUrl: string) {
    await this.findOne(orgId, id);
    return this.prisma.employee.update({ where: { id }, data: { photoUrl } });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.employee.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  async addDocument(orgId: string, empId: string, doc: any) {
    await this.findOne(orgId, empId);
    return this.prisma.employeeDocument.create({ data: { ...doc, employeeId: empId } });
  }

  async getDocuments(orgId: string, empId: string) {
    await this.findOne(orgId, empId);
    return this.prisma.employeeDocument.findMany({ where: { employeeId: empId } });
  }

  async getSalaryStructure(orgId: string, empId: string) {
    await this.findOne(orgId, empId);
    return this.prisma.salaryStructure.findUnique({ where: { employeeId: empId } });
  }

  async updateSalaryStructure(orgId: string, empId: string, dto: any) {
    await this.findOne(orgId, empId);
    return this.prisma.salaryStructure.upsert({
      where: { employeeId: empId },
      create: { ...dto, employeeId: empId, organizationId: orgId },
      update: dto,
    });
  }

  async findByUserId(userId: string, orgId: string) {
    return this.prisma.employee.findFirst({
      where: { userId, organizationId: orgId },
      include: {
        salaryStructure: true,
        department: true,
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
    });
  }

  async updateByUserId(userId: string, orgId: string, dto: any) {
    const emp = await this.prisma.employee.findFirst({ where: { userId, organizationId: orgId } });
    if (!emp) throw new Error('Employee not found');
    const ibanUpdated = dto.iban && dto.iban !== emp.iban;
    const { phone, nationality, iban, bankAccount } = dto;
    return this.prisma.employee.update({
      where: { id: emp.id },
      data: { ...(phone && { phone }), ...(nationality && { nationality }), ...(iban && { iban }), ...(bankAccount && { bankAccount }) },
      include: { salaryStructure: true, department: true },
    });
  }


  async bulkIncrement(orgId: string, dto: { departmentId?: string; percentage: number; effectiveDate: string }) {
    const where: any = { organizationId: orgId, status: 'ACTIVE' };
    if (dto.departmentId) where.departmentId = dto.departmentId;

    const employees = await this.prisma.employee.findMany({
      where,
      include: { salaryStructure: true },
    });

    const pct = dto.percentage / 100;
    let updated = 0;

    for (const emp of employees) {
      if (!emp.salaryStructure) continue;
      const ss = emp.salaryStructure as any;
      const data: any = {};

      if (ss.basicSalary)         data.basicSalary         = Math.round(ss.basicSalary * (1 + pct));
      if (ss.housingAllowance)    data.housingAllowance    = Math.round(ss.housingAllowance * (1 + pct));
      if (ss.transportAllowance)  data.transportAllowance  = Math.round(ss.transportAllowance * (1 + pct));
      if (ss.medicalAllowance)    data.medicalAllowance    = Math.round(ss.medicalAllowance * (1 + pct));
      if (ss.ctcAnnual)           data.ctcAnnual           = Math.round(ss.ctcAnnual * (1 + pct));

      if (Object.keys(data).length > 0) {
        await this.prisma.salaryStructure.update({ where: { id: ss.id }, data });
        updated++;
      }
    }

    return { updated, total: employees.length, percentage: dto.percentage };
  }

}
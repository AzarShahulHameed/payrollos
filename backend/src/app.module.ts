import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule }          from './common/prisma/prisma.module';
import { EmailModule }           from './modules/email/email.module';
import { PdfModule }             from './modules/pdf/pdf.module';
import { AuthModule }            from './modules/auth/auth.module';
import { OrganizationsModule }   from './modules/organizations/organizations.module';
import { EmployeesModule }       from './modules/employees/employees.module';
import { DepartmentsModule }     from './modules/departments/departments.module';
import { PayrollModule }         from './modules/payroll/payroll.module';
import { PayrunModule }          from './modules/payrun/payrun.module';
import { PayslipsModule }        from './modules/payslips/payslips.module';
import { LeavesModule }          from './modules/leaves/leaves.module';
import { LoansModule }           from './modules/loans/loans.module';
import { AdvancesModule }        from './modules/advances/advances.module';
import { ReportsModule }         from './modules/reports/reports.module';
import { SettingsModule }        from './modules/settings/settings.module';
import { NotificationsModule }   from './modules/notifications/notifications.module';
import { AnalyticsModule }       from './modules/analytics/analytics.module';
import { AttendanceModule }      from './modules/attendance/attendance.module';
import { ReimbursementsModule }  from './modules/reimbursements/reimbursements.module';
import { WpsModule }             from './modules/wps/wps.module';
import { EmployeeImportModule }  from './modules/employee-import/employee-import.module';
import { FnfModule }             from './modules/fnf/fnf.module';
import { ArrearsModule }         from './modules/arrears/arrears.module';
import { AuditLogModule }        from './modules/audit-log/audit-log.module';
import { AppSchedulerModule }    from './modules/scheduler/scheduler.module';
import { SearchModule }           from './modules/search/search.module';
import { UploadModule }           from './modules/upload/upload.module';
import { BonusModule }            from './modules/bonus/bonus.module';
import { DocumentsModule }        from './modules/documents/documents.module';
import { BranchesModule }         from './modules/branches/branches.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },  // 10 req/sec per IP
      { name: 'medium', ttl: 60000, limit: 100 },  // 100 req/min per IP
      { name: 'long',   ttl: 900000,limit: 1000},  // 1000 req/15min per IP
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    PdfModule,
    AuthModule,
    OrganizationsModule,
    DepartmentsModule,
    EmployeesModule,
    PayrollModule,
    PayrunModule,
    PayslipsModule,
    LeavesModule,
    LoansModule,
    AdvancesModule,
    ReportsModule,
    SettingsModule,
    NotificationsModule,
    AnalyticsModule,
    AttendanceModule,
    ReimbursementsModule,
    WpsModule,
    EmployeeImportModule,
    FnfModule,
    ArrearsModule,
    AuditLogModule,
    AppSchedulerModule,
    SearchModule,
    UploadModule,
    BonusModule,
    DocumentsModule,
    BranchesModule,
  ],
})
export class AppModule {}

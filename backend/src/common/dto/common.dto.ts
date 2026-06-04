import {
  IsString, IsEmail, IsOptional, IsNumber, IsBoolean,
  IsDateString, MinLength, MaxLength, IsIn, Min, Max,
  IsInt, IsPositive, Matches, IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
 
// Strip HTML tags and trim — applied to every string field
const Sanitize = () => Transform(({ value }) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/<[^>]*>/g, '').substring(0, 10000);
});
 
// ── Salary structure ─────────────────────────────────────────
export class SalaryStructureDto {
  @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) basicSalary?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) housingAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) transportAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) medicalAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) otherAllowances?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) ctcAnnual?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) basicPct?: number;
  @IsOptional() @IsIn(['NEW','OLD']) taxRegime?: string;
  @IsOptional() @IsIn(['METRO','NON_METRO']) cityType?: string;
}
 
 
// ── Employee ──────────────────────────────────────────────────
export class CreateEmployeeDto {
  @IsString() @MinLength(1) @MaxLength(100) @Sanitize() firstName: string;
  @IsString() @MinLength(1) @MaxLength(100) @Sanitize() lastName: string;
  @IsEmail()  @MaxLength(255) email: string;
  @IsOptional() @IsString() @MaxLength(25)  phone?: string;
  @IsOptional() @IsString() @MaxLength(150) @Sanitize() designation?: string;
  @IsOptional() @IsString() @MaxLength(36)  departmentId?: string;
  @IsOptional() @IsString() @MaxLength(36)  branchId?: string;
  @IsOptional() @IsDateString() joiningDate?: string;
  @IsOptional() @IsIn(['UAE','INDIA']) region?: string;
  @IsOptional() @IsString() @MaxLength(100) @Sanitize() nationality?: string;
  @IsOptional() @IsString() @MaxLength(30)  emiratesId?: string;
  @IsOptional() @IsString() @MaxLength(20)  passportNo?: string;
  @IsOptional() @IsString() @MaxLength(30)  visaNo?: string;
  @IsOptional() @IsString() @MaxLength(34)
  @Matches(/^(AE\d{21})?$/, { message: 'IBAN must be valid UAE format (AE + 21 digits)' })
  iban?: string;
  @IsOptional() @IsString() @MaxLength(30)  bankAccount?: string;
  @IsOptional() @IsString() @MaxLength(30)  ifscCode?: string;
  @IsOptional() @IsBoolean() isUAENational?: boolean;
  @IsOptional() salaryStructure?: SalaryStructureDto;
}
 
export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MaxLength(100) @Sanitize() firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) @Sanitize() lastName?: string;
  @IsOptional() @IsEmail()  @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(25)  phone?: string;
  @IsOptional() @IsString() @MaxLength(150) @Sanitize() designation?: string;
  @IsOptional() @IsString() @MaxLength(36)  departmentId?: string;
  @IsOptional() @IsString() @MaxLength(100) @Sanitize() nationality?: string;
  @IsOptional() @IsString() @MaxLength(30)  emiratesId?: string;
  @IsOptional() @IsString() @MaxLength(20)  passportNo?: string;
  @IsOptional() @IsString() @MaxLength(30)  visaNo?: string;
  @IsOptional() @IsString() @MaxLength(34)  iban?: string;
  @IsOptional() @IsString() @MaxLength(30)  bankAccount?: string;
  @IsOptional() @IsString() @MaxLength(30)  ifscCode?: string;
  @IsOptional() @IsIn(['ACTIVE','INACTIVE','ON_LEAVE','TERMINATED']) status?: string;
  @IsOptional() salaryStructure?: SalaryStructureDto;
}
 
// ── Leave ────────────────────────────────────────────────────
export class CreateLeaveDto {
  @IsOptional() @IsString() @MaxLength(36) employeeId?: string;
  @IsString() @IsIn(['ANNUAL','SICK','CASUAL','MATERNITY','PATERNITY','UNPAID','HAJJ']) leaveType: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsString() @MaxLength(500) @Sanitize() reason?: string;
}
 
// ── Loan ─────────────────────────────────────────────────────
export class CreateLoanDto {
  @IsOptional() @IsString() @MaxLength(36) employeeId?: string;
  @IsNumber() @IsPositive() @Max(10_000_000) @Type(() => Number) amount: number;
  @IsInt()    @Min(1) @Max(60)              @Type(() => Number) installments: number;
  @IsOptional() @IsString() @MaxLength(500) @Sanitize() reason?: string;
}
 
// ── Advance ──────────────────────────────────────────────────
export class CreateAdvanceDto {
  @IsOptional() @IsString() @MaxLength(36) employeeId?: string;
  @IsNumber() @IsPositive() @Max(1_000_000) @Type(() => Number) amount: number;
  @IsOptional() @IsString() @MaxLength(500) @Sanitize() reason?: string;
}
 
// ── Reimbursement ────────────────────────────────────────────
export class CreateReimbursementDto {
  @IsOptional() @IsString() @MaxLength(36) employeeId?: string;
  @IsNumber() @IsPositive() @Max(100_000) @Type(() => Number) amount: number;
  @IsString() @IsIn(['Travel','Meals','Accommodation','Medical','Training','Equipment','Communication','Other']) category: string;
  @IsOptional() @IsString() @MaxLength(500) @Sanitize() description?: string;
  @IsOptional() @IsString() @MaxLength(500) receiptUrl?: string;
}
 
// ── Department ───────────────────────────────────────────────
export class CreateDepartmentDto {
  @IsString() @MinLength(1) @MaxLength(100) @Sanitize() name: string;
}
 
// ── Invite user ──────────────────────────────────────────────
export class InviteUserDto {
  @IsString() @MinLength(1) @MaxLength(100) @Sanitize() firstName: string;
  @IsString() @MinLength(1) @MaxLength(100) @Sanitize() lastName: string;
  @IsEmail()  @MaxLength(255) email: string;
  @IsString() @IsIn(['ADMIN','HR','MANAGER','ACCOUNTANT','EMPLOYEE']) role: string;
}
 
// ── Change password ──────────────────────────────────────────
export class ChangePasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}
 
// ── Payrun ───────────────────────────────────────────────────
export class CreatePayrunDto {
  @IsInt() @Min(2020) @Max(2100) @Type(() => Number) year: number;
  @IsInt() @Min(1)    @Max(12)   @Type(() => Number) month: number;
  @IsString() @IsIn(['UAE','INDIA']) region: string;
  @IsOptional() @IsString() @MaxLength(100) name?: string;
}
 
// ── Attendance ───────────────────────────────────────────────
export class CreateAttendanceDto {
  @IsString() @MaxLength(36) employeeId: string;
  @IsDateString() date: string;
  @IsOptional() @IsString() @IsIn(['PRESENT','ABSENT','HALF_DAY','LATE','WFH','HOLIDAY','WEEKEND']) status?: string;
  @IsOptional() @IsString() @MaxLength(8) @Matches(/^\d{2}:\d{2}(:\d{2})?$|^\d{4}-\d{2}-\d{2}T.*$/, { message: 'checkIn must be HH:MM or ISO format' }) checkIn?: string;
  @IsOptional() @IsString() @MaxLength(30) checkOut?: string;
}
 
// ── Document ─────────────────────────────────────────────────
export class CreateDocumentDto {
  @IsString() @IsIn(['PASSPORT','EMIRATES_ID','VISA','LABOUR_CARD','MEDICAL','EDUCATION','CONTRACT','OTHER']) type: string;
  @IsString() @MaxLength(200) @Sanitize() name: string;
  @IsString() @MaxLength(2000) fileUrl: string;
  @IsOptional() @IsDateString() expiryDate?: string;
}
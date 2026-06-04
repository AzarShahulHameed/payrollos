import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';

export const UAE_REQUIRED_FIELDS   = ['firstName','lastName','email','designation','joiningDate','basicSalary'];
export const INDIA_REQUIRED_FIELDS = ['firstName','lastName','email','designation','joiningDate','ctcAnnual'];
export const UAE_OPTIONAL_FIELDS   = ['phone','nationality','emiratesId','visaNo','passportNo','iban','bankAccount','housingAllowance','transportAllowance','medicalAllowance','otherAllowances','isUaeNational','departmentName'];
export const INDIA_OPTIONAL_FIELDS = ['phone','panNumber','uanNumber','aadharNumber','bankAccount','taxRegime','basicPct','cityType','departmentName'];

@Injectable()
export class EmployeeImportService {
  constructor(private prisma: PrismaService) {}

  getTemplate(region: string) {
    const required = region === 'UAE' ? UAE_REQUIRED_FIELDS : INDIA_REQUIRED_FIELDS;
    const optional = region === 'UAE' ? UAE_OPTIONAL_FIELDS : INDIA_OPTIONAL_FIELDS;
    const headers  = [...required, ...optional];

    const example = region === 'UAE'
      ? { firstName:'John', lastName:'Smith', email:'john@example.com', designation:'Software Engineer', joiningDate:'2024-01-15', basicSalary:'8000', housingAllowance:'3000', transportAllowance:'1000', medicalAllowance:'500', otherAllowances:'0', phone:'+971501234567', nationality:'Indian', emiratesId:'784-1990-1234567-1', iban:'AE070331234567890123456', bankAccount:'0331234567890', isUaeNational:'false', departmentName:'Engineering' }
      : { firstName:'Priya', lastName:'Sharma', email:'priya@example.com', designation:'Developer', joiningDate:'2024-01-15', ctcAnnual:'1200000', phone:'+919876543210', panNumber:'ABCDE1234F', uanNumber:'100123456789', aadharNumber:'123456789012', bankAccount:'12345678901234', taxRegime:'NEW', basicPct:'40', cityType:'METRO', departmentName:'Engineering' };

    const csvRows = [
      headers.join(','),
      headers.map(h => (example as any)[h] || '').join(','),
    ];

    return { headers, required, optional, example, csv: csvRows.join('\n') };
  }

  validateRows(rows: any[], region: string): { valid: any[]; errors: string[] } {
    const required = region === 'UAE' ? UAE_REQUIRED_FIELDS : INDIA_REQUIRED_FIELDS;
    const valid: any[] = [];
    const errors: string[] = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2;
      const missing = required.filter(f => !row[f] || row[f].toString().trim() === '');
      if (missing.length) {
        errors.push(`Row ${rowNum} (${row.firstName || 'unknown'}): Missing required fields: ${missing.join(', ')}`);
        return;
      }

      // Validate email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${rowNum}: Invalid email: ${row.email}`);
        return;
      }

      // Validate date
      if (isNaN(Date.parse(row.joiningDate))) {
        errors.push(`Row ${rowNum}: Invalid joiningDate: ${row.joiningDate} (use YYYY-MM-DD)`);
        return;
      }

      // Validate salary
      if (region === 'UAE' && (isNaN(+row.basicSalary) || +row.basicSalary <= 0)) {
        errors.push(`Row ${rowNum}: Invalid basicSalary: must be positive number`);
        return;
      }
      if (region === 'INDIA' && (isNaN(+row.ctcAnnual) || +row.ctcAnnual <= 0)) {
        errors.push(`Row ${rowNum}: Invalid ctcAnnual: must be positive number`);
        return;
      }

      // India PAN format validation
      if (region === 'INDIA' && row.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(row.panNumber.toUpperCase())) {
        errors.push(`Row ${rowNum}: Invalid PAN format: ${row.panNumber} (should be AAAAA9999A)`);
        return;
      }

      valid.push(row);
    });

    return { valid, errors };
  }

  async importEmployees(orgId: string, rows: any[], region: string) {
    const { valid, errors } = this.validateRows(rows, region);
    const results = { created: 0, skipped: 0, errors: [...errors], total: rows.length };

    for (const row of valid) {
      try {
        // Check duplicate email
        const existing = await this.prisma.employee.findFirst({ where: { email: row.email, organizationId: orgId } });
        if (existing) {
          results.errors.push(`Skipped: ${row.email} already exists`);
          results.skipped++;
          continue;
        }

        // Find or create department
        let departmentId: string | undefined;
        if (row.departmentName) {
          let dept = await this.prisma.department.findFirst({ where: { name: row.departmentName, organizationId: orgId } });
          if (!dept) dept = await this.prisma.department.create({ data: { name: row.departmentName, organizationId: orgId } });
          departmentId = dept.id;
        }

        // Generate employee code
        const count = await this.prisma.employee.count({ where: { organizationId: orgId } });
        const employeeCode = `EMP-${String(count + 1).padStart(4, '0')}`;

        const salaryStructure = region === 'UAE'
          ? { basicSalary: +row.basicSalary, housingAllowance: +(row.housingAllowance || 0), transportAllowance: +(row.transportAllowance || 0), medicalAllowance: +(row.medicalAllowance || 0), otherAllowances: +(row.otherAllowances || 0), organizationId: orgId }
          : { ctcAnnual: +row.ctcAnnual, basicPct: +(row.basicPct || 40), taxRegime: row.taxRegime || 'NEW', cityType: row.cityType || 'METRO', organizationId: orgId };

        await this.prisma.employee.create({
          data: {
            firstName:    row.firstName.trim(),
            lastName:     row.lastName.trim(),
            email:        row.email.trim().toLowerCase(),
            phone:        row.phone || null,
            designation:  row.designation.trim(),
            joiningDate:  new Date(row.joiningDate + 'T00:00:00.000Z'),
            region:       region as any,
            employeeCode,
            organizationId: orgId,
            departmentId:   departmentId || null,
            status:         'ACTIVE',
            // UAE
            emiratesId:     row.emiratesId   || null,
            visaNo:         row.visaNo        || null,
            passportNo:     row.passportNo    || null,
            iban:           row.iban           || null,
            bankAccount:    row.bankAccount    || null,
            nationality:    row.nationality    || null,
            isUaeNational:  row.isUaeNational === 'true',
            // India
            panNumber:      row.panNumber?.toUpperCase() || null,
            uanNumber:      row.uanNumber     || null,
            aadharNumber:   row.aadharNumber  || null,
            salaryStructure: { create: salaryStructure },
          },
        });

        results.created++;
      } catch (e: any) {
        results.errors.push(`Error for ${row.email}: ${e.message}`);
        results.skipped++;
      }
    }

    return results;
  }

  parseCSV(csv: string): any[] {
    const lines  = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new BadRequestException('CSV must have headers and at least one data row');
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });
  }
}

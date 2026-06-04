import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmployeeImportController } from './employee-import.controller';
import { EmployeeImportService } from './employee-import.service';
@Module({ imports:[PrismaModule], controllers:[EmployeeImportController], providers:[EmployeeImportService], exports:[EmployeeImportService] })
export class EmployeeImportModule {}

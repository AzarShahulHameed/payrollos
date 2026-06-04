import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmailService } from '../email/email.service';
import { memoryStorage } from 'multer';
 
@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmailService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
 
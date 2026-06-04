import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SchedulerService } from './scheduler.service';
@Module({ imports: [PrismaModule], providers: [SchedulerService] })
export class AppSchedulerModule {}

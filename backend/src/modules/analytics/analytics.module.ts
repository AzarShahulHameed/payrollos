import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
@Module({ imports: [PrismaModule], controllers: [AnalyticsController, DashboardController], providers: [AnalyticsService] })
export class AnalyticsModule {}

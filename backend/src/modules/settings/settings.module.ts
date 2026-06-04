import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailService } from '../email/email.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
@Module({ imports: [PrismaModule], controllers: [SettingsController], providers: [SettingsService, EmailService] })
export class SettingsModule {}
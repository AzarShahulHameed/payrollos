import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PayrunController } from './payrun.controller';
import { EmailService } from '../email/email.service';
import { PayrunService } from './payrun.service';
@Module({ imports: [PrismaModule], controllers: [PayrunController], providers: [PayrunService, EmailService], exports: [PayrunService] })
export class PayrunModule {}

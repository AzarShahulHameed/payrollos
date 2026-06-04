import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { BonusController } from './bonus.controller';
import { BonusService } from './bonus.service';
@Module({ imports: [PrismaModule], controllers: [BonusController], providers: [BonusService] })
export class BonusModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AdvancesController } from './advances.controller';
import { AdvancesService } from './advances.service';
@Module({ imports: [PrismaModule], controllers: [AdvancesController], providers: [AdvancesService] })
export class AdvancesModule {}

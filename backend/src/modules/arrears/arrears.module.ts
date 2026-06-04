import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ArrearsController } from './arrears.controller';
import { ArrearsService } from './arrears.service';
@Module({ imports: [PrismaModule], controllers: [ArrearsController], providers: [ArrearsService] })
export class ArrearsModule {}

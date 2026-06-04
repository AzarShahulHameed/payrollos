import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { WpsController } from './wps.controller';
import { WpsService } from './wps.service';
@Module({ imports:[PrismaModule], controllers:[WpsController], providers:[WpsService] })
export class WpsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { FnfController } from './fnf.controller';
import { FnfService } from './fnf.service';
@Module({ imports: [PrismaModule], controllers: [FnfController], providers: [FnfService] })
export class FnfModule {}

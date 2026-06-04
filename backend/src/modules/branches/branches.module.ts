import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { BranchesController } from './branches.controller';
@Module({ imports: [PrismaModule], controllers: [BranchesController] })
export class BranchesModule {}

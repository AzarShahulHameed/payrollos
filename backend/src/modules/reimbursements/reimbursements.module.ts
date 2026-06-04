import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ReimbursementsController } from './reimbursements.controller';
import { ReimbursementsService } from './reimbursements.service';
@Module({ imports:[PrismaModule], controllers:[ReimbursementsController], providers:[ReimbursementsService] })
export class ReimbursementsModule {}

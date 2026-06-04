import {
  Injectable, NotFoundException,
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req,
  Module,
} from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateDeptDto { @IsString() name: string; @IsOptional() managerId?: string; }
class UpdateDeptDto { @IsOptional() @IsString() name?: string; @IsOptional() managerId?: string; }

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      include: { employees: { where: { status: 'ACTIVE' }, select: { id: true } } },
      orderBy: { name: 'asc' },
    });
  }

  create(organizationId: string, dto: CreateDeptDto) {
    return this.prisma.department.create({ data: { ...dto, organizationId } });
  }

  update(id: string, dto: UpdateDeptDto) {
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException();
    // Move employees to General dept first if needed
    return this.prisma.department.delete({ where: { id } });
  }
}

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private svc: DepartmentsService) {}

  @Get()    list(@Req() req: any)                               { return this.svc.list(req.user.orgId); }
  @Post()   create(@Req() req: any, @Body() dto: CreateDeptDto) { return this.svc.create(req.user.orgId, dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDeptDto) { return this.svc.update(id, dto); }
  @Delete(':id') delete(@Param('id') id: string)               { return this.svc.delete(id); }
}

@Module({ controllers: [DepartmentsController], providers: [DepartmentsService], exports: [DepartmentsService] })
export class DepartmentsModule {}

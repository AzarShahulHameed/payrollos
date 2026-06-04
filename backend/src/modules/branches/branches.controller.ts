import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.module';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll(@Request() req) {
    return (this.prisma as any).branch.findMany({
      where: { organizationId: req.user.orgId },
      include: { _count: { select: { employees: true } } },
      orderBy: { isHQ: 'desc' },
    }).catch(() => []);
  }

  @Post()
  async create(@Request() req, @Body() dto: any) {
    return (this.prisma as any).branch.create({
      data: {
        organizationId: req.user.orgId,
        name:    dto.name,
        region:  dto.region || 'UAE',
        address: dto.address || null,
        phone:   dto.phone   || null,
        isHQ:    dto.isHQ    || false,
      },
    });
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return (this.prisma as any).branch.update({
      where: { id, organizationId: req.user.orgId },
      data: {
        name:    dto.name,
        region:  dto.region,
        address: dto.address,
        phone:   dto.phone,
        isHQ:    dto.isHQ,
      },
    });
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const branch = await (this.prisma as any).branch.findFirst({
      where: { id, organizationId: req.user.orgId },
    });
    if (branch?.isHQ) throw new Error('Cannot delete HQ branch');
    return (this.prisma as any).branch.delete({ where: { id } });
  }
}

import {
  Injectable, NotFoundException, ConflictException,
  Controller, Get, Post, Patch, Body, UseGuards, Req, Module,
} from '@nestjs/common';
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class UpdateOrgDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() region?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, dto: UpdateOrgDto) {
    return this.prisma.organization.update({ where: { id }, data: dto });
  }
}

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private svc: OrganizationsService) {}

  @Get('me') @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  getMyOrg(@Req() req: any) { return this.svc.findById(req.user.orgId); }

  @Patch('me') @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  updateMyOrg(@Req() req: any, @Body() dto: UpdateOrgDto) {
    return this.svc.update(req.user.orgId, dto);
  }
}

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}

import { CreateEmployeeDto, UpdateEmployeeDto } from '../../common/dto/common.dto';
import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
  UseGuards, Request, Req, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  @Get('me')
  getMe(@Request() req) {
    // Find employee linked to current user
    return this.svc.findByUserId(req.user.id, req.user.orgId);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() dto: any) {
    return this.svc.updateByUserId(req.user.id, req.user.orgId, dto);
  }

  @Get()
  findAll(@Request() req, @Query() query: any) {
    return this.svc.findAll(req.user.orgId, query);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.orgId, id);
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.svc.create(req.user.orgId, dto);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(req.user.orgId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.svc.remove(req.user.orgId, id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(@Request() req, @Param('id') id: string, @UploadedFile() file: any) {
    // In production, upload to S3/MinIO and return URL
    const photoUrl = `/uploads/photos/${id}-${Date.now()}.jpg`;
    return this.svc.updatePhoto(req.user.orgId, id, photoUrl);
  }

  @Get(':id/documents')
  getDocuments(@Request() req, @Param('id') id: string) {
    return this.svc.getDocuments(req.user.orgId, id);
  }

  @Post(':id/documents')
  addDocument(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.svc.addDocument(req.user.orgId, id, dto);
  }

  @Get(':id/salary-structure')
  getSalaryStructure(@Request() req, @Param('id') id: string) {
    return this.svc.getSalaryStructure(req.user.orgId, id);
  }

  @Put(':id/salary-structure')
  updateSalaryStructure(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateSalaryStructure(req.user.orgId, id, dto);
  }

  @Post('bulk-increment')
  bulkIncrement(@Req() req: any, @Body() dto: { departmentId?: string; percentage: number; effectiveDate: string }) {
    return this.svc.bulkIncrement(req.user.orgId, dto);
  }

}
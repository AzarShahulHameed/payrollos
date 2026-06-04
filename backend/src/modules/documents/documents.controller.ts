import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private svc: DocumentsService) {}
  @Get('employees')                          listEmps(@Request() req)                                          { return this.svc.listEmployees(req.user.orgId); }
  @Get('employee/:id')                       getByEmp(@Request() req, @Param('id') id: string)                { return this.svc.getByEmployee(req.user.orgId, id); }
  @Post('employee/:id')                      create(@Request() req, @Param('id') id: string, @Body() dto:any) { return this.svc.create(req.user.orgId, id, dto); }
  @Put(':id')                                update(@Request() req, @Param('id') id: string, @Body() dto:any) { return this.svc.update(req.user.orgId, id, dto); }
  @Delete(':id')                             remove(@Request() req, @Param('id') id: string)                  { return this.svc.remove(req.user.orgId, id); }
}

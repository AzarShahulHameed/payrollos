import { CreateDepartmentDto, InviteUserDto } from '../../common/dto/common.dto';
import { Controller, Get, Put, Patch, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}
  @Get()    getSettings(@Request() req) { return this.svc.getSettings(req.user.orgId); }
  @Put()    updateSettings(@Request() req, @Body() dto: any) { return this.svc.updateSettings(req.user.orgId, dto); }
  @Patch()  updateSettingsPatch(@Request() req, @Body() dto: any) { return this.svc.updateSettings(req.user.orgId, dto); }
  @Get('organization')    getOrg(@Request() req) { return this.svc.getOrganization(req.user.orgId); }
  @Put('organization')    updateOrg(@Request() req, @Body() dto: any) { return this.svc.updateOrganization(req.user.orgId, dto); }
  @Patch('organization')  updateOrgPatch(@Request() req, @Body() dto: any) { return this.svc.updateOrganization(req.user.orgId, dto); }
  @Get('departments') getDepts(@Request() req) { return this.svc.getDepartments(req.user.orgId); }
  @Post('departments') createDept(@Request() req, @Body() dto: CreateDepartmentDto) { return this.svc.createDepartment(req.user.orgId, dto); }
  @Put('departments/:id')   updateDept(@Request() req, @Param('id') id: string, @Body() dto: any) { return this.svc.updateDepartment(req.user.orgId, id, dto); }
  @Patch('departments/:id') updateDeptPatch(@Request() req, @Param('id') id: string, @Body() dto: any) { return this.svc.updateDepartment(req.user.orgId, id, dto); }
  @Delete('departments/:id') deleteDept(@Request() req, @Param('id') id: string) { return this.svc.deleteDepartment(req.user.orgId, id); }
  @Get('users') getUsers(@Request() req) { return this.svc.getUsers(req.user.orgId); }
  @Post('users/invite')   inviteUser(@Request() req, @Body() dto: InviteUserDto)                     { return this.svc.inviteUser(req.user.orgId, dto); }
  @Patch('users/:id/role') updateRole(@Request() req, @Param('id') id: string, @Body() dto: any) { return this.svc.updateUserRole(req.user.orgId, id, dto.role); }
  @Delete('users/:id')     removeUser(@Request() req, @Param('id') id: string)                   { return this.svc.removeUser(req.user.orgId, id); }
}

import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}
  @Get()           getAll(@Request() req)                          { return this.svc.getForUser(req.user.id, req.user.orgId); }
  @Get('unread')   unread(@Request() req)                         { return this.svc.getUnreadCount(req.user.id); }
  @Patch('read-all') readAll(@Request() req)                      { return this.svc.markAllRead(req.user.id); }
  @Patch(':id/read') read(@Request() req, @Param('id') id: string){ return this.svc.markRead(req.user.id, id); }
}

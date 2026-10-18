import { Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@Req() req: any) { return this.notifications.list(req.user.userId); }
  @Get('unread-count') unreadCount(@Req() req: any) { return this.notifications.unreadCount(req.user.userId); }
  @Patch(':id/read') markRead(@Req() req: any, @Param('id') id: string) { return this.notifications.markRead(req.user.userId, id); }
  @Post('read-all') markAllRead(@Req() req: any) { return this.notifications.markAllRead(req.user.userId); }
}

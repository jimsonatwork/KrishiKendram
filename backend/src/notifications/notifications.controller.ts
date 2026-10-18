import { Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@Req() req: any, @Query() query: NotificationQueryDto) { return this.notifications.list(req.user.userId, query); }
  @Get('unread-count') unreadCount(@Req() req: any) { return this.notifications.unreadCount(req.user.userId); }
  @Patch(':id/read') markRead(@Req() req: any, @Param('id') id: string) { return this.notifications.markRead(req.user.userId, id); }
  @Post('read-all') markAllRead(@Req() req: any) { return this.notifications.markAllRead(req.user.userId); }
}

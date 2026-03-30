import { Controller, Get, Patch, Param, Query, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

type RequestWithUser = Request & { user: { id: string } };

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @Request() req: RequestWithUser,
    @Query('isRead') isReadStr?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const isRead =
      isReadStr != null
        ? isReadStr === 'true'
          ? true
          : isReadStr === 'false'
            ? false
            : undefined
        : undefined;
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitStr ?? '20', 10) || 20);
    return this.notifications.listForUser(req.user.id, { isRead, page, limit });
  }

  @Get('unread-count')
  async unreadCount(@Request() req: RequestWithUser) {
    return this.notifications.unreadCountForUser(req.user.id);
  }

  @Patch(':id/read')
  async markRead(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.notifications.markRead(req.user.id, id);
  }

  @Patch('readAll')
  async markAllRead(@Request() req: RequestWithUser) {
    return this.notifications.markAllRead(req.user.id);
  }
}

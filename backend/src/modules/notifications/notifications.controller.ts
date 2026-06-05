import { Controller, Get, Patch, Param, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

type RequestWithUser = Request & { user: { id: string } };

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  private parseBoolean(value?: string): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  @Get()
  async list(
    @Request() req: RequestWithUser,
    @Query('isRead') isReadStr?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const isRead = this.parseBoolean(isReadStr);
    const page = Math.max(1, Number.parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.max(1, Number.parseInt(limitStr ?? '20', 10) || 20);
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

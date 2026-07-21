import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import type { AuthenticatedUser } from '../identity/types/authenticated-user';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('unreadOnly') unreadOnly?: string) {
    return this.notifications.list(user.id, unreadOnly === 'true');
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }
}

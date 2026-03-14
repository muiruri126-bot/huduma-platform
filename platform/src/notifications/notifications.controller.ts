import { Controller, Get, Patch, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('fcm-token')
  registerFcmToken(
    @CurrentUser('id') userId: string,
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.notificationsService.registerFcmToken(userId, fcmToken);
  }

  @Delete('fcm-token')
  removeFcmToken(@CurrentUser('id') userId: string) {
    return this.notificationsService.removeFcmToken(userId);
  }

  @Get()
  getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getUserNotifications(userId, page, limit);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}

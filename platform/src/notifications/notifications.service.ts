import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.logger.log('Firebase Admin SDK initialized');
    } else {
      this.logger.warn('Firebase credentials not configured — push notifications disabled');
    }
  }

  async send(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ?? undefined,
        sentAt: new Date(),
      },
    });

    // Channel dispatch based on type
    switch (type) {
      case 'push':
        await this.sendPush(userId, title, body, data);
        break;
      case 'sms':
        await this.sendSms(userId, body);
        break;
      case 'in_app':
        // Already stored in DB — clients pull or receive via WebSocket
        break;
      // email and whatsapp channels added in Phase 2
    }

    return notification;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  // ── Channel implementations ──

  private async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!admin.apps.length) {
      this.logger.warn('Firebase not initialized, skipping push');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      this.logger.debug(`No FCM token for user ${userId}`);
      return;
    }

    try {
      await admin.messaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data: data
          ? Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, String(v)]),
            )
          : undefined,
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'huduma_default' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });
      this.logger.debug(`Push sent to user ${userId}`);
    } catch (error: any) {
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null },
        });
        this.logger.warn(`Cleared invalid FCM token for user ${userId}`);
      } else {
        this.logger.error(`Push failed for user ${userId}: ${error.message}`);
      }
    }
  }

  async registerFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    return { message: 'FCM token registered' };
  }

  async removeFcmToken(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
    return { message: 'FCM token removed' };
  }

  private async sendSms(userId: string, message: string) {
    // TODO: Integrate Africa's Talking SMS API
    // 1. Look up user's phone number
    // 2. Send via Africa's Talking SDK
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    console.log(`[SMS] To ${user?.phone}: ${message}`);
  }
}

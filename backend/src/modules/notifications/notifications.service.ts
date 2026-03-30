import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './notifications.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

export type NotificationResponse = {
  id: string;
  ticketId: string;
  event: string;
  title: string;
  meta?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

export type PaginatedNotifications = {
  items: NotificationResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createMany(
    userIds: string[],
    payload: {
      event: string;
      ticketId: string;
      title: string;
      meta?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    const docs = userIds.map((u) => ({
      userId: new Types.ObjectId(u),
      event: payload.event,
      ticketId: new Types.ObjectId(payload.ticketId),
      title: payload.title,
      meta: payload.meta ?? {},
      isRead: false,
    }));
    await this.notificationModel.insertMany(docs, { ordered: false });
  }

  async listForUser(
    userId: string,
    params?: { isRead?: boolean; page?: number; limit?: number },
  ): Promise<PaginatedNotifications> {
    const page = Math.max(1, params?.page ?? 1);
    const safeLimit = Math.min(
      Math.max(1, params?.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const skip = (page - 1) * safeLimit;
    const q: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (typeof params?.isRead === 'boolean') q.isRead = params.isRead;
    type LeanNotification = {
      _id: Types.ObjectId;
      ticketId: Types.ObjectId;
      event: string;
      title?: string;
      meta?: Record<string, unknown>;
      isRead?: boolean;
      createdAt?: Date | string;
    };

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<LeanNotification[]>()
        .exec(),
      this.notificationModel.countDocuments(q).exec(),
    ]);
    return {
      items: items.map((n) => ({
        id: String(n._id),
        ticketId: String(n.ticketId),
        event: n.event,
        title: n.title ?? '',
        meta: n.meta ?? {},
        isRead: !!n.isRead,
        createdAt:
          n.createdAt instanceof Date
            ? n.createdAt.toISOString()
            : String(n.createdAt ?? ''),
      })),
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async unreadCountForUser(userId: string): Promise<{ count: number }> {
    const count = await this.notificationModel
      .countDocuments({ userId: new Types.ObjectId(userId), isRead: false })
      .exec();
    return { count };
  }

  async createForAdmins(payload: {
    event: string;
    ticketId: string;
    title: string;
    meta?: Record<string, unknown>;
  }): Promise<void> {
    // Trouver tous les admins et créer une notif chacun
    const admins = await this.userModel
      .find({ role: UserRole.ADMIN })
      .select({ _id: 1 })
      .lean()
      .exec();
    const adminIds = admins.map((a) => String(a._id));
    await this.createMany(adminIds, payload);
  }

  async markRead(userId: string, id: string): Promise<{ success: true }> {
    await this.notificationModel
      .updateOne(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { isRead: true } },
      )
      .exec();
    return { success: true };
  }

  async markAllRead(userId: string): Promise<{ success: true }> {
    await this.notificationModel
      .updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true } },
      )
      .exec();
    return { success: true };
  }
}

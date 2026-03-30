import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  event: string; // 'ticket.created' | 'ticket.assigned' | 'ticket.status_changed'

  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true })
  ticketId: Types.ObjectId;

  @Prop({ default: '' })
  title: string; // small text to display

  @Prop({ type: Object, default: {} })
  meta: Record<string, unknown>;

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index principal pour listForUser (filtre userId + tri createdAt)
NotificationSchema.index({ userId: 1, createdAt: -1 });

// Index pour fetchUnreadCount (filtre userId + isRead + tri createdAt)
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

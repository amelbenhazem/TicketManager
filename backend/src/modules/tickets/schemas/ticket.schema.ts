import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketCategory {
  RESEAU = 'reseau',
  LOGICIEL = 'logiciel',
  MATERIEL = 'materiel',
  AUTRE = 'autre',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true, enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Prop({ required: true, enum: TicketCategory, default: TicketCategory.AUTRE })
  category: TicketCategory;

  @Prop({
    required: true,
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Prop({ type: [String], default: [] })
  /** URLs Cloudinary (secure_url) retournées par POST /tickets/attachments/upload. Rien d’autre n’est garanti (pas de chemin local, pas d’identifiant opaque seul). */
  attachments: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo: Types.ObjectId | null;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

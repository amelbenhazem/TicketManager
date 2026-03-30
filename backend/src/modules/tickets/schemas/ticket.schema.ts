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

export type TicketHistoryEntry = {
  actorId: string; // user id à l'origine du changement
  actorRole?: string; // role (admin/technician/client) si disponible
  action: 'status_changed' | 'assigned_changed' | 'created' | 'updated';
  field?:
    | 'status'
    | 'assignedTo'
    | 'title'
    | 'description'
    | 'category'
    | 'priority'
    | 'attachments';
  from?: string | null; // ancienne valeur (stringifiée)
  to?: string | null; // nouvelle valeur (stringifiée)
  timestamp: Date;
};

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

  @Prop({
    type: [
      {
        actorId: { type: String, required: true },
        actorRole: { type: String },
        action: { type: String, required: true },
        field: { type: String },
        from: { type: String, default: null },
        to: { type: String, default: null },
        timestamp: { type: Date, required: true },
      },
    ],
    default: [],
  })
  history: TicketHistoryEntry[];
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Ticket,
  TicketDocument,
  TicketStatus,
  TicketCategory,
  TicketPriority,
} from './schemas/ticket.schema';
import { CreateTicketDto } from './dto';
import { UpdateTicketDto } from './dto';

export type TicketResponse = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  priority: TicketPriority;
  attachments: string[];
  userId: string;
  assignedTo: string | null;
  createdAt: string;
  createdBy?: { id: string; firstName: string; lastName: string; email: string };
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
  ) {}

  async findAllByUser(userId: string): Promise<TicketResponse[]> {
    const objectId = new Types.ObjectId(userId);
    const tickets = await this.ticketModel
      .find({ userId: objectId })
      .sort({ createdAt: -1 })
      .exec();
    return tickets.map((t) => this.toResponse(t));
  }

  async findAll(): Promise<TicketResponse[]> {
    const tickets = await this.ticketModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    return tickets.map((t) => this.toResponse(t));
  }

  async findAllByAssignedTo(technicianId: string): Promise<TicketResponse[]> {
    const objectId = new Types.ObjectId(technicianId);
    const tickets = await this.ticketModel
      .find({ assignedTo: objectId })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email')
      .exec();
    return tickets.map((t) => this.toResponse(t, true));
  }

  async findOne(id: string, requestUserId: string, isAdmin: boolean): Promise<TicketResponse | null> {
    const ticket = await this.ticketModel
      .findById(id)
      .populate('userId', 'firstName lastName email')
      .exec();
    if (!ticket) return null;
    const populated = ticket as unknown as { userId: { _id?: Types.ObjectId; firstName?: string; lastName?: string; email?: string } | Types.ObjectId };
    const ownerId = populated.userId
      ? typeof populated.userId === 'object' && populated.userId && '_id' in populated.userId
        ? String((populated.userId as { _id: Types.ObjectId })._id)
        : String(populated.userId)
      : '';
    const assignedToId = ticket.assignedTo != null ? String(ticket.assignedTo) : null;
    const isOwner = ownerId === requestUserId;
    const isAssigned = assignedToId === requestUserId;
    if (!isAdmin && !isOwner && !isAssigned) return null;
    return this.toResponse(ticket, true);
  }

  async create(userId: string, dto: CreateTicketDto): Promise<TicketResponse> {
    const ticket = await this.ticketModel.create({
      title: dto.title,
      description: dto.description ?? '',
      status: TicketStatus.OPEN,
      category: dto.category ?? TicketCategory.AUTRE,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      attachments: dto.attachments ?? [],
      userId: new Types.ObjectId(userId),
      assignedTo: null,
    });
    return this.toResponse(ticket);
  }

  async update(
    id: string,
    dto: UpdateTicketDto,
  ): Promise<TicketResponse | null> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) return null;
    if (dto.status !== undefined) ticket.status = dto.status;
    if (dto.assignedTo !== undefined) {
      ticket.assignedTo = dto.assignedTo
        ? new Types.ObjectId(dto.assignedTo)
        : null;
    }
    await ticket.save();
    return this.toResponse(ticket);
  }

  async updateStatusByAssigned(
    id: string,
    technicianId: string,
    status: TicketStatus,
  ): Promise<TicketResponse | null> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) return null;
    const assignedId = ticket.assignedTo != null ? String(ticket.assignedTo) : null;
    if (assignedId !== technicianId) return null;
    ticket.status = status;
    await ticket.save();
    return this.toResponse(ticket);
  }

  private toResponse(ticket: TicketDocument, withCreatedBy = false): TicketResponse {
    const doc = ticket as TicketDocument & { createdAt?: Date; userId?: unknown };
    const created =
      doc.createdAt != null
        ? doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : String(doc.createdAt)
        : '';
    const userId = ticket.userId;
    let createdBy: TicketResponse['createdBy'];
    if (withCreatedBy && userId && typeof userId === 'object' && 'email' in userId) {
      const u = userId as { _id?: Types.ObjectId; firstName?: string; lastName?: string; email?: string };
      createdBy = {
        id: u._id != null ? String(u._id) : '',
        firstName: u.firstName ?? '',
        lastName: u.lastName ?? '',
        email: u.email ?? '',
      };
    }
    return {
      id: ticket._id != null ? String(ticket._id) : '',
      title: ticket.title,
      description: ticket.description ?? '',
      status: ticket.status,
      category: ticket.category ?? TicketCategory.AUTRE,
      priority: ticket.priority ?? TicketPriority.MEDIUM,
      attachments: Array.isArray(ticket.attachments) ? ticket.attachments : [],
      userId: userId != null ? (typeof userId === 'object' && '_id' in (userId as object) ? String((userId as { _id: Types.ObjectId })._id) : String(userId)) : '',
      assignedTo:
        ticket.assignedTo != null ? String(ticket.assignedTo) : null,
      createdAt: created,
      ...(createdBy && { createdBy }),
    };
  }
}

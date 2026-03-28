import { Injectable, ForbiddenException } from '@nestjs/common';
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
import { UserRole } from '../users/schemas/user.schema';
import { TicketsNotificationsGateway } from './tickets-notifications.gateway';

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
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type PaginatedTickets = {
  items: TicketResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    private readonly ticketsNotifications: TicketsNotificationsGateway,
  ) {}

  async findAllByUser(
    userId: string,
    page = 1,
    limit = DEFAULT_LIMIT,
  ): Promise<PaginatedTickets> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * safeLimit;
    const objectId = new Types.ObjectId(userId);
    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('userId', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .exec(),
      this.ticketModel.countDocuments({ userId: objectId }).exec(),
    ]);
    return {
      items: tickets.map((t) => this.toResponse(t)),
      total,
      page: Math.max(1, page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async findAll(page = 1, limit = DEFAULT_LIMIT): Promise<PaginatedTickets> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * safeLimit;
    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('userId', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .exec(),
      this.ticketModel.countDocuments().exec(),
    ]);
    return {
      items: tickets.map((t) => this.toResponse(t)),
      total,
      page: Math.max(1, page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async findAllByAssignedTo(
    technicianId: string,
    page = 1,
    limit = DEFAULT_LIMIT,
  ): Promise<PaginatedTickets> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * safeLimit;
    const objectId = new Types.ObjectId(technicianId);
    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find({ assignedTo: objectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('userId', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .exec(),
      this.ticketModel.countDocuments({ assignedTo: objectId }).exec(),
    ]);
    return {
      items: tickets.map((t) => this.toResponse(t)),
      total,
      page: Math.max(1, page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async findOne(
    id: string,
    requestUserId: string,
    isAdmin: boolean,
  ): Promise<TicketResponse | null> {
    const ticket = await this.ticketModel
      .findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .exec();
    if (!ticket) return null;
    const populated = ticket as unknown as {
      userId:
        | {
            _id?: Types.ObjectId;
            firstName?: string;
            lastName?: string;
            email?: string;
          }
        | Types.ObjectId;
      assignedTo:
        | {
            _id?: Types.ObjectId;
            firstName?: string;
            lastName?: string;
            email?: string;
          }
        | Types.ObjectId
        | null;
    };
    const ownerId = this.toUserIdString(populated.userId);
    const assignedToId =
      ticket.assignedTo != null ? this.toUserIdString(ticket.assignedTo) : null;
    const isOwner = ownerId === requestUserId;
    const isAssigned = assignedToId === requestUserId;
    if (!isAdmin && !isOwner && !isAssigned) return null;
    return this.toResponse(ticket);
  }

  async getTicketForGuard(
    id: string,
  ): Promise<{ assignedToId: string | null } | null> {
    const ticket = await this.ticketModel
      .findById(id)
      .select('assignedTo')
      .lean()
      .exec();
    if (!ticket) return null;
    const assignedToId =
      ticket.assignedTo != null ? String(ticket.assignedTo) : null;
    return { assignedToId };
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
    await ticket.populate('userId', 'firstName lastName email');
    const created = this.toResponse(ticket);
    this.ticketsNotifications.notifyTicketCreated(created, userId);
    return created;
  }

  async update(
    id: string,
    dto: UpdateTicketDto,
    user: { id: string; role: UserRole },
  ): Promise<TicketResponse | null> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) return null;
    const previousStatus = ticket.status;
    const previousAssignedTo =
      ticket.assignedTo != null ? String(ticket.assignedTo) : null;

    // ✅ Fix 1 — cast (user.role as UserRole)
    if ((user.role as UserRole) === UserRole.ADMIN) {
      if (dto.status !== undefined) ticket.status = dto.status;
      if (dto.assignedTo !== undefined) {
        ticket.assignedTo = dto.assignedTo
          ? new Types.ObjectId(dto.assignedTo)
          : null;
      }
      await ticket.save();
      await ticket.populate('userId', 'firstName lastName email');
      await ticket.populate('assignedTo', 'firstName lastName email');
      const updated = this.toResponse(ticket);
      if (
        dto.assignedTo !== undefined &&
        previousAssignedTo !== updated.assignedTo
      ) {
        this.ticketsNotifications.notifyTicketAssigned(
          updated,
          previousAssignedTo,
          user.id,
        );
      }
      if (dto.status !== undefined && previousStatus !== updated.status) {
        this.ticketsNotifications.notifyTicketStatusChanged(
          updated,
          previousStatus,
          user.id,
        );
      }
      return updated;
    }

    // ✅ Fix 2 — cast (user.role as UserRole)
    if ((user.role as UserRole) === UserRole.TECHNICIAN) {
      const assignedId =
        ticket.assignedTo != null ? String(ticket.assignedTo) : null;
      if (assignedId !== user.id) {
        throw new ForbiddenException(
          'Seul le technicien assigné à ce ticket peut le modifier.',
        );
      }
      if (dto.assignedTo !== undefined) {
        throw new ForbiddenException(
          "Le technicien ne peut pas modifier l'affectation du ticket.",
        );
      }
      if (dto.status === undefined) {
        throw new ForbiddenException(
          'Le technicien ne peut modifier que le statut du ticket.',
        );
      }
      if (dto.status === TicketStatus.CLOSED) {
        throw new ForbiddenException(
          "Seul l'administrateur peut clôturer un ticket.",
        );
      }
      ticket.status = dto.status;
      await ticket.save();
      await ticket.populate('userId', 'firstName lastName email');
      await ticket.populate('assignedTo', 'firstName lastName email');
      const updated = this.toResponse(ticket);
      if (dto.status !== undefined && previousStatus !== updated.status) {
        this.ticketsNotifications.notifyTicketStatusChanged(
          updated,
          previousStatus,
          user.id,
        );
      }
      return updated;
    }

    throw new ForbiddenException('Action non autorisée');
  }

  private toUserIdString(userId: unknown): string {
    if (userId == null) return '';
    if (typeof userId === 'object' && userId !== null && '_id' in userId)
      return String((userId as { _id: Types.ObjectId })._id);
    return String(userId as Types.ObjectId);
  }

  private toResponse(ticket: TicketDocument): TicketResponse {
    const doc = ticket as TicketDocument & {
      createdAt?: Date;
      userId?: unknown;
      assignedTo?: unknown;
    };
    const created =
      doc.createdAt != null
        ? doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : String(doc.createdAt)
        : '';
    const userId = ticket.userId;
    const assignedToRaw = ticket.assignedTo;

    let createdBy: TicketResponse['createdBy'];
    if (userId && typeof userId === 'object' && 'email' in (userId as object)) {
      const u = userId as {
        _id?: Types.ObjectId;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
      createdBy = {
        id: u._id != null ? String(u._id) : '',
        firstName: u.firstName ?? '',
        lastName: u.lastName ?? '',
        email: u.email ?? '',
      };
    }

    let assignedToUser: TicketResponse['assignedToUser'];
    if (
      assignedToRaw &&
      typeof assignedToRaw === 'object' &&
      'firstName' in (assignedToRaw as object)
    ) {
      const a = assignedToRaw as {
        _id?: Types.ObjectId;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
      assignedToUser = {
        id: a._id != null ? String(a._id) : '',
        firstName: a.firstName ?? '',
        lastName: a.lastName ?? '',
        email: a.email ?? '',
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
      userId: this.toUserIdString(userId),
      assignedTo:
        assignedToRaw != null ? this.toUserIdString(assignedToRaw) : null,
      createdAt: created,
      ...(createdBy && { createdBy }),
      ...(assignedToUser && { assignedToUser }),
    };
  }
}
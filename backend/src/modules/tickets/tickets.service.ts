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
import { NotificationsService } from '../notifications/notifications.service';

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
  history?: Array<{
    actorId: string;
    actorRole?: string;
    action: string;
    field?: string;
    from?: string | null;
    to?: string | null;
    timestamp: string;
  }>;
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

export type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  createdFrom?: string;
  createdTo?: string;
  assignedTo?: string | null;
  search?: string;
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    private readonly ticketsNotifications: TicketsNotificationsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  private buildBaseQuery(filters?: TicketFilters): Record<string, unknown> {
    const q: Record<string, unknown> = {};
    if (!filters) return q;

    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.category) q.category = filters.category;

    if (filters.createdFrom || filters.createdTo) {
      const created: Record<string, unknown> = {};
      if (filters.createdFrom) created.$gte = new Date(filters.createdFrom);
      if (filters.createdTo) created.$lte = new Date(filters.createdTo);
      q.createdAt = created;
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      q.$or = [
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    return q;
  }

  async getStats(): Promise<{
    byStatus: Record<TicketStatus, number>;
    byPriority: Record<TicketPriority, number>;
    byTechnician: Array<{ technicianId: string | null; count: number }>;
    total: number;
  }> {
    const [byStatusAgg, byPriorityAgg, byTechnicianAgg, total] = await Promise.all([
      this.ticketModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.ticketModel.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      this.ticketModel.aggregate([
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      this.ticketModel.countDocuments().exec(),
    ]);

    const initStatus: Record<TicketStatus, number> = {
      [TicketStatus.OPEN]: 0,
      [TicketStatus.IN_PROGRESS]: 0,
      [TicketStatus.RESOLVED]: 0,
      [TicketStatus.CLOSED]: 0,
    };
    const initPriority: Record<TicketPriority, number> = {
      [TicketPriority.LOW]: 0,
      [TicketPriority.MEDIUM]: 0,
      [TicketPriority.HIGH]: 0,
    };

    for (const it of byStatusAgg) {
      if (it?._id && it.count != null && it.count >= 0 && it._id in initStatus) {
        initStatus[it._id as TicketStatus] = it.count as number;
      }
    }
    for (const it of byPriorityAgg) {
      if (it?._id && it.count != null && it.count >= 0 && it._id in initPriority) {
        initPriority[it._id as TicketPriority] = it.count as number;
      }
    }

    const byTechnician = byTechnicianAgg.map((it) => ({
      technicianId: it._id != null ? String(it._id) : null,
      count: it.count as number,
    }));

    return { byStatus: initStatus, byPriority: initPriority, byTechnician, total };
  }
  async findAllByUser(
    userId: string,
    page = 1,
    limit = DEFAULT_LIMIT,
    filters?: TicketFilters,
  ): Promise<PaginatedTickets> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * safeLimit;
    const objectId = new Types.ObjectId(userId);
    const q = { ...this.buildBaseQuery(filters), userId: objectId };
    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find(q)
        // Projection: la liste client n'a pas besoin de champs lourds
        .select({
          title: 1,
          description: 1,
          status: 1,
          category: 1,
          priority: 1,
          attachments: 1,
          userId: 1,
          assignedTo: 1,
          createdAt: 1,
          history: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('userId', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .lean()
        .exec(),
      this.ticketModel.countDocuments(q).exec(),
    ]);
    return {
      items: tickets.map((t) => this.toResponse(t as any)),
      total,
      page: Math.max(1, page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async findAll(page = 1, limit = DEFAULT_LIMIT, filters?: TicketFilters): Promise<PaginatedTickets> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * safeLimit;
    const q = this.buildBaseQuery(filters);
    if (filters && 'assignedTo' in filters) {
      // Admin-only usage: assignedTo filter (string id or null for unassigned)
      if (filters.assignedTo === null) q.assignedTo = null;
      else if (filters.assignedTo) q.assignedTo = new Types.ObjectId(filters.assignedTo);
    }
    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('userId', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .exec(),
      this.ticketModel.countDocuments(q).exec(),
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
    filters?: TicketFilters,
  ): Promise<PaginatedTickets> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const skip = (Math.max(1, page) - 1) * safeLimit;
    const objectId = new Types.ObjectId(technicianId);
    const q = { ...this.buildBaseQuery(filters), assignedTo: objectId };
    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('userId', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .exec(),
      this.ticketModel.countDocuments(q).exec(),
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
      history: [
        {
          actorId: userId,
          actorRole: 'client',
          action: 'created',
          field: undefined,
          from: null,
          to: null,
          timestamp: new Date(),
        },
      ],
    });
    await ticket.populate('userId', 'firstName lastName email');
    const created = this.toResponse(ticket);
    this.ticketsNotifications.notifyTicketCreated(created, userId);
    // Notifications persistantes: ADMIN uniquement (ne pas notifier le client créateur)
    await this.notifications.createForAdmins({
      event: 'ticket.created',
      ticketId: created.id,
      title: `Nouveau ticket: ${created.title}`,
      meta: {},
    });
    return created;
  }

  async update(
    id: string,
    dto: UpdateTicketDto,
    user: { id: string; role: UserRole },
  ): Promise<TicketResponse | null> {
    const frStatus = (s: TicketStatus | string): string => {
      const map: Record<string, string> = {
        open: 'Ouvert',
        in_progress: 'En cours',
        resolved: 'Résolu',
        closed: 'Clôturé',
      };
      return map[String(s)] ?? String(s);
    };
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) return null;
    const previousStatus = ticket.status;
    const previousAssignedTo =
      ticket.assignedTo != null ? String(ticket.assignedTo) : null;

    // ✅ Fix 1 — cast (user.role as UserRole)
    if (user.role === UserRole.ADMIN) {
      if (dto.status !== undefined) ticket.status = dto.status;
      if (dto.assignedTo !== undefined) {
        ticket.assignedTo = dto.assignedTo
          ? new Types.ObjectId(dto.assignedTo)
          : null;
      }
      // Historique: stocker les changements pertinents
      const historyEntries: Array<Parameters<typeof ticket.updateOne>[0]> = [];
      if (dto.status !== undefined && previousStatus !== dto.status) {
        (ticket as any).history.push({
          actorId: user.id,
          actorRole: 'admin',
          action: 'status_changed',
          field: 'status',
          from: String(previousStatus),
          to: String(dto.status),
          timestamp: new Date(),
        });
      }
      if (dto.assignedTo !== undefined && previousAssignedTo !== (ticket.assignedTo ? String(ticket.assignedTo) : null)) {
        (ticket as any).history.push({
          actorId: user.id,
          actorRole: 'admin',
          action: 'assigned_changed',
          field: 'assignedTo',
          from: previousAssignedTo,
          to: ticket.assignedTo ? String(ticket.assignedTo) : null,
          timestamp: new Date(),
        });
      }
      await ticket.save();
      await ticket.populate('userId', 'firstName lastName email');
      await ticket.populate('assignedTo', 'firstName lastName email');
      const updated = this.toResponse(ticket);
      if (
        dto.assignedTo !== undefined &&
        previousAssignedTo !== updated.assignedTo
      ) {
        // Temps réel: notifier le technicien nouvellement assigné
        this.ticketsNotifications.notifyTicketAssigned(updated, previousAssignedTo, user.id);

        // Notifications persistantes:
        // - CLIENT: technicien affecté/retiré
        const technicianLabel =
          updated.assignedToUser
            ? `${updated.assignedToUser.firstName ?? ''} ${updated.assignedToUser.lastName ?? ''}`.trim()
            : updated.assignedTo
              ? String(updated.assignedTo)
              : null;
        const title =
          updated.assignedTo && technicianLabel
            ? `Technicien affecté: ${technicianLabel}`
            : `Affectation retirée`;
        await this.notifications.createMany([updated.userId], {
          event: 'ticket.assigned',
          ticketId: updated.id,
          title,
          meta: { previousAssignedTo },
        });

        // - TECHNICIEN assigné: nouveau ticket affecté
        if (updated.assignedTo) {
          await this.notifications.createMany([updated.assignedTo], {
            event: 'ticket.assigned',
            ticketId: updated.id,
            title: `Ticket affecté: ${updated.title}`,
            meta: { previousAssignedTo },
          });
        }
      }
      if (dto.status !== undefined && previousStatus !== updated.status) {
        const recipients = [
          updated.userId,
          ...(updated.assignedTo ? [updated.assignedTo] : []),
        ].filter((v, i, a) => v && a.indexOf(v) === i) as string[];
        await this.notifications.createMany(recipients, {
          event: 'ticket.status_changed',
          ticketId: updated.id,
          title: `Statut: ${frStatus(previousStatus)} → ${frStatus(updated.status)}`,
          meta: { previousStatus },
        });
      }
      return updated;
    }

    // ✅ Fix 2 — cast (user.role as UserRole)
    if (user.role === UserRole.TECHNICIAN) {
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
      if (dto.status !== undefined && previousStatus !== dto.status) {
        (ticket as any).history.push({
          actorId: user.id,
          actorRole: 'technician',
          action: 'status_changed',
          field: 'status',
          from: String(previousStatus),
          to: String(dto.status),
          timestamp: new Date(),
        });
      }
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
        // Notifications persistantes: client + admins (pas le technicien)
        await this.notifications.createMany([updated.userId], {
          event: 'ticket.status_changed',
          ticketId: updated.id,
          title: `Statut: ${frStatus(previousStatus)} → ${frStatus(updated.status)}`,
          meta: { previousStatus },
        });
        await this.notifications.createForAdmins({
          event: 'ticket.status_changed',
          ticketId: updated.id,
          title: `Statut: ${frStatus(previousStatus)} → ${frStatus(updated.status)}`,
          meta: { previousStatus },
        });
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
      history?: Array<{
        actorId: string;
        actorRole?: string;
        action: string;
        field?: string;
        from?: string | null;
        to?: string | null;
        timestamp?: Date | string;
      }>;
    };
    const created =
      doc.createdAt != null
        ? doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : String(doc.createdAt)
        : '';
    const userId = ticket.userId;
    const assignedToRaw = ticket.assignedTo;

    const history =
      Array.isArray(doc.history) && doc.history.length > 0
        ? doc.history.map((h) => ({
            actorId: h.actorId,
            actorRole: h.actorRole,
            action: h.action,
            field: h.field,
            from: h.from ?? null,
            to: h.to ?? null,
            timestamp:
              h.timestamp instanceof Date
                ? h.timestamp.toISOString()
                : String(h.timestamp ?? ''),
          }))
        : undefined;

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
      ...(history && { history }),
      ...(createdBy && { createdBy }),
      ...(assignedToUser && { assignedToUser }),
    };
  }
}

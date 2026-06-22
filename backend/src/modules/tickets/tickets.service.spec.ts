import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TicketsService } from './tickets.service';
import { Ticket, TicketStatus } from './schemas/ticket.schema';
import { TicketsNotificationsGateway } from './tickets-notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../users/schemas/user.schema';

function makeTicketDoc(partial: Partial<any>) {
  const doc: any = {
    _id: partial._id ?? new Types.ObjectId(),
    title: partial.title ?? 't',
    description: partial.description ?? '',
    status: partial.status ?? TicketStatus.OPEN,
    category: partial.category ?? 'autre',
    priority: partial.priority ?? 'medium',
    attachments: partial.attachments ?? [],
    userId: partial.userId ?? new Types.ObjectId(),
    assignedTo: partial.assignedTo ?? null,
    history: partial.history ?? [],
    createdAt: partial.createdAt ?? new Date(),
    save: jest.fn().mockResolvedValue(undefined),
    populate: jest.fn().mockResolvedValue(undefined),
  };
  return doc;
}

describe('TicketsService (unit)', () => {
  let service: TicketsService;
  let ticketModel: {
    create: jest.Mock;
    findById: jest.Mock;
    findByIdAndDelete?: jest.Mock;
    find?: jest.Mock;
    countDocuments?: jest.Mock;
  };
  let gateway: {
    notifyTicketCreated: jest.Mock;
    notifyTicketAssigned: jest.Mock;
    notifyTicketStatusChanged: jest.Mock;
    notifyTicketDeleted: jest.Mock;
  };
  let notifications: {
    createForAdmins: jest.Mock;
    createMany: jest.Mock;
    deleteByTicketId: jest.Mock;
  };

  beforeEach(async () => {
    ticketModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    gateway = {
      notifyTicketCreated: jest.fn(),
      notifyTicketAssigned: jest.fn(),
      notifyTicketStatusChanged: jest.fn(),
      notifyTicketDeleted: jest.fn(),
    };
    notifications = {
      createForAdmins: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue(undefined),
      deleteByTicketId: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getModelToken(Ticket.name), useValue: ticketModel },
        { provide: TicketsNotificationsGateway, useValue: gateway },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(TicketsService);
  });

  it('create(): client creates ticket -> notify admins only (persistent) + realtime ticket.created', async () => {
    const createdDoc = makeTicketDoc({
      title: 'Panne',
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      assignedTo: null,
      history: [],
    });
    ticketModel.create.mockResolvedValue(createdDoc);

    const res = await service.create('507f1f77bcf86cd799439011', {
      title: 'Panne',
      description: 'desc',
      attachments: [],
      category: 'autre' as any,
      priority: 'medium' as any,
    });

    expect(ticketModel.create).toHaveBeenCalled();
    expect(createdDoc.populate).toHaveBeenCalledWith(
      'userId',
      'firstName lastName email',
    );
    expect(gateway.notifyTicketCreated).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Panne' }),
      '507f1f77bcf86cd799439011',
    );
    expect(notifications.createForAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ticket.created',
        title: expect.stringContaining('Nouveau ticket'),
      }),
    );
    expect(res.title).toBe('Panne');
  });

  it('findAllByUser(): builds query with filters (search + status)', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    ticketModel.find = jest.fn().mockReturnValue(chain);
    ticketModel.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    await service.findAllByUser('507f1f77bcf86cd799439011', 1, 20, {
      status: TicketStatus.OPEN,
      search: 'abc',
    } as any);

    expect(ticketModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Types.ObjectId),
        status: TicketStatus.OPEN,
        $or: [
          { title: { $regex: 'abc', $options: 'i' } },
          { description: { $regex: 'abc', $options: 'i' } },
        ],
      }),
    );
  });

  it('findAll(): uses base query and paginates (no projection/lean options)', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    ticketModel.find = jest.fn().mockReturnValue(chain);
    ticketModel.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    await service.findAll(1, 20, { search: 'abc' } as any);

    expect(ticketModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [
          { title: { $regex: 'abc', $options: 'i' } },
          { description: { $regex: 'abc', $options: 'i' } },
        ],
      }),
    );
  });

  it('findAll(): trims search and skips $or when blank after trim', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    ticketModel.find = jest.fn().mockReturnValue(chain);
    ticketModel.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    await service.findAll(1, 20, { search: '   ' } as any);

    // Ensure called with a query object that does NOT contain $or
    expect(ticketModel.find).toHaveBeenCalledWith(
      expect.not.objectContaining({ $or: expect.anything() }),
    );
  });

  it('findAllByUser(): builds date range when createdFrom/createdTo provided', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    ticketModel.find = jest.fn().mockReturnValue(chain);
    ticketModel.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    await service.findAllByUser('507f1f77bcf86cd799439011', 1, 20, {
      createdFrom: '2024-01-01',
      createdTo: '2024-12-31',
    } as any);

    expect(ticketModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Types.ObjectId),
        createdAt: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        }),
      }),
    );
  });

  it('findAll(): applies assignedTo filter when null (unassigned)', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    ticketModel.find = jest.fn().mockReturnValue(chain);
    ticketModel.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    await service.findAll(1, 20, { assignedTo: null } as any);

    expect(ticketModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: null }),
    );
  });

  it('findAll(): applies assignedTo filter when id provided', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    ticketModel.find = jest.fn().mockReturnValue(chain);
    ticketModel.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    await service.findAll(1, 20, { assignedTo: '507f1f77bcf86cd799439012' } as any);

    expect(ticketModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: expect.any(Types.ObjectId) }),
    );
  });

  it('findAllByUser(): uses projection and lean options', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    ticketModel.find = jest.fn().mockReturnValue(chain);
    ticketModel.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    await service.findAllByUser('507f1f77bcf86cd799439011', 1, 20, {} as any);

    expect(chain.select).toHaveBeenCalled();
    expect(chain.lean).toHaveBeenCalled();
  });

  it('getTicketForGuard(): returns null when not found', async () => {
    ticketModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });
    const res = await service.getTicketForGuard('missing');
    expect(res).toBeNull();
  });

  it('getTicketForGuard(): returns assignedToId and userId when found', async () => {
    const doc = {
      assignedTo: new Types.ObjectId('507f1f77bcf86cd799439012'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
    };
    ticketModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(doc),
    });
    const res = await service.getTicketForGuard('x');
    expect(res).toEqual({
      assignedToId: '507f1f77bcf86cd799439012',
      userId: '507f1f77bcf86cd799439011',
    });
  });

  it('update(): technician changes status -> notifies client + admins and emits realtime status_changed', async () => {
    const doc = makeTicketDoc({
      status: TicketStatus.OPEN,
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      assignedTo: new Types.ObjectId('507f1f77bcf86cd799439012'),
      history: [],
    });
    ticketModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    const updated = await service.update(
      String(doc._id),
      { status: TicketStatus.IN_PROGRESS },
      { id: '507f1f77bcf86cd799439012', role: UserRole.TECHNICIAN },
    );

    expect(updated?.status).toBe(TicketStatus.IN_PROGRESS);
    expect(doc.save).toHaveBeenCalled();
    expect(gateway.notifyTicketStatusChanged).toHaveBeenCalled();
    expect(notifications.createMany).toHaveBeenCalledWith(
      [expect.any(String)],
      expect.objectContaining({ event: 'ticket.status_changed' }),
    );
    expect(notifications.createForAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ticket.status_changed' }),
    );
  });

  it('update(): technician cannot update ticket not assigned to them', async () => {
    const doc = makeTicketDoc({
      assignedTo: new Types.ObjectId('507f1f77bcf86cd799439099'),
    });
    ticketModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    await expect(
      service.update(
        String(doc._id),
        { status: TicketStatus.RESOLVED },
        { id: '507f1f77bcf86cd799439012', role: UserRole.TECHNICIAN },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update(): client updates open ticket content', async () => {
    const clientId = '507f1f77bcf86cd799439011';
    const doc = makeTicketDoc({
      userId: new Types.ObjectId(clientId),
      status: TicketStatus.OPEN,
      title: 'Ancien titre',
      description: 'Ancienne description',
      history: [],
    });
    ticketModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    const updated = await service.update(
      String(doc._id),
      {
        title: 'Nouveau titre',
        description: 'Nouvelle description',
      },
      { id: clientId, role: UserRole.CLIENT },
    );

    expect(updated?.title).toBe('Nouveau titre');
    expect(doc.save).toHaveBeenCalled();
    expect(doc.history).toHaveLength(2);
  });

  it('update(): client cannot update ticket when not open', async () => {
    const clientId = '507f1f77bcf86cd799439011';
    const doc = makeTicketDoc({
      userId: new Types.ObjectId(clientId),
      status: TicketStatus.IN_PROGRESS,
    });
    ticketModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    await expect(
      service.update(
        String(doc._id),
        { title: 'Nouveau titre' },
        { id: clientId, role: UserRole.CLIENT },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update(): client cannot change status', async () => {
    const clientId = '507f1f77bcf86cd799439011';
    const doc = makeTicketDoc({
      userId: new Types.ObjectId(clientId),
      status: TicketStatus.OPEN,
    });
    ticketModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    await expect(
      service.update(
        String(doc._id),
        { status: TicketStatus.RESOLVED },
        { id: clientId, role: UserRole.CLIENT },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('remove(): admin deletes ticket and related notifications', async () => {
    const doc = makeTicketDoc({
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      assignedTo: new Types.ObjectId('507f1f77bcf86cd799439012'),
      title: 'Ticket à supprimer',
    });
    ticketModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });
    ticketModel.findByIdAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    const res = await service.remove(String(doc._id));

    expect(res).toEqual({ success: true });
    expect(notifications.deleteByTicketId).toHaveBeenCalledWith(String(doc._id));
    expect(ticketModel.findByIdAndDelete).toHaveBeenCalledWith(String(doc._id));
    expect(gateway.notifyTicketDeleted).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: String(doc._id),
        title: 'Ticket à supprimer',
      }),
    );
  });

  it('update(): admin assigns technician -> notifies client + assigned technician, emits realtime assigned', async () => {
    const doc = makeTicketDoc({
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      assignedTo: null,
      history: [],
      title: 'Ticket X',
    });
    // populate should resolve; toResponse uses populated values but for this unit test we only assert calls
    ticketModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    const res = await service.update(
      String(doc._id),
      { assignedTo: '507f1f77bcf86cd799439012' },
      { id: 'admin1', role: UserRole.ADMIN },
    );

    expect(doc.save).toHaveBeenCalled();
    expect(gateway.notifyTicketAssigned).toHaveBeenCalled();
    // client notified
    expect(notifications.createMany).toHaveBeenCalledWith(
      [expect.any(String)],
      expect.objectContaining({ event: 'ticket.assigned' }),
    );
    // technician notified
    expect(notifications.createMany).toHaveBeenCalledWith(
      ['507f1f77bcf86cd799439012'],
      expect.objectContaining({ event: 'ticket.assigned' }),
    );
    expect(res).not.toBeNull();
  });
});

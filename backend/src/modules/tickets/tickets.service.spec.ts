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
    find?: jest.Mock;
    countDocuments?: jest.Mock;
  };
  let gateway: {
    notifyTicketCreated: jest.Mock;
    notifyTicketAssigned: jest.Mock;
    notifyTicketStatusChanged: jest.Mock;
  };
  let notifications: {
    createForAdmins: jest.Mock;
    createMany: jest.Mock;
  };

  beforeEach(async () => {
    ticketModel = {
      create: jest.fn(),
      findById: jest.fn(),
    };
    gateway = {
      notifyTicketCreated: jest.fn(),
      notifyTicketAssigned: jest.fn(),
      notifyTicketStatusChanged: jest.fn(),
    };
    notifications = {
      createForAdmins: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue(undefined),
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

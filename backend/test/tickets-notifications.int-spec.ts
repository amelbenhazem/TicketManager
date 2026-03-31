import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, Types } from 'mongoose';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../src/config';
import { TicketsModule } from '../src/modules/tickets/tickets.module';
import { NotificationsModule } from '../src/modules/notifications/notifications.module';
import { UsersModule } from '../src/modules/users/users.module';
import { TicketsService } from '../src/modules/tickets/tickets.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { TicketsNotificationsGateway } from '../src/modules/tickets/tickets-notifications.gateway';
import { Notification, NotificationDocument } from '../src/modules/notifications/notifications.schema';
import { User, UserDocument, UserRole } from '../src/modules/users/schemas/user.schema';

describe('Integration: TicketsService -> NotificationsService -> Gateway -> MongoDB', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;

  let ticketsService: TicketsService;
  let notificationsService: NotificationsService;
  let gateway: TicketsNotificationsGateway;
  let notificationModel: Model<NotificationDocument>;
  let userModel: Model<UserDocument>;
  let adminId: Types.ObjectId;
  let techId: Types.ObjectId;
  let clientId: Types.ObjectId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        // AuthModule (importé par TicketsModule) dépend de ConfigService
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          // tests: pas besoin de lire .env
          ignoreEnvFile: true,
        }),
        MongooseModule.forRoot(uri),
        // Modules réels
        UsersModule,
        NotificationsModule,
        TicketsModule,
      ],
    })
      .overrideProvider(TicketsNotificationsGateway)
      .useValue({
        notifyTicketCreated: jest.fn(),
        notifyTicketAssigned: jest.fn(),
        notifyTicketStatusChanged: jest.fn(),
      })
      .compile();

    ticketsService = moduleRef.get(TicketsService);
    notificationsService = moduleRef.get(NotificationsService);
    gateway = moduleRef.get(TicketsNotificationsGateway);
    notificationModel = moduleRef.get(getModelToken(Notification.name));
    userModel = moduleRef.get(getModelToken(User.name));
  });

  beforeEach(async () => {
    await notificationModel.deleteMany({}).exec();
    await userModel.deleteMany({}).exec();

    adminId = new Types.ObjectId();
    techId = new Types.ObjectId();
    clientId = new Types.ObjectId();

    await userModel.create([
      {
        _id: adminId,
        email: 'admin@ex.tn',
        password: 'hashed',
        firstName: 'A',
        lastName: 'B',
        role: UserRole.ADMIN,
      },
      {
        _id: techId,
        email: 'tech@ex.tn',
        password: 'hashed',
        firstName: 'T',
        lastName: 'E',
        role: UserRole.TECHNICIAN,
      },
      {
        _id: clientId,
        email: 'client@ex.tn',
        password: 'hashed',
        firstName: 'C',
        lastName: 'L',
        role: UserRole.CLIENT,
      },
    ]);
  });

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (mongod) await mongod.stop();
  });

  it('Create ticket -> ticket saved, admin persistent notification created, gateway event emitted', async () => {
    // Act
    const created = await ticketsService.create(String(clientId), {
      title: 'Ticket INT',
      description: 'desc',
      category: 'autre' as any,
      priority: 'medium' as any,
      attachments: [],
    });

    // Assert: gateway called
    expect((gateway as any).notifyTicketCreated).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Ticket INT' }),
      String(clientId),
    );

    // Assert: notification persisted for admins
    const adminNotifs = await notificationModel
      .find({ userId: adminId, event: 'ticket.created' })
      .lean()
      .exec();
    expect(adminNotifs.length).toBe(1);
    expect(adminNotifs[0].title).toContain('Nouveau ticket');
    expect(created.title).toBe('Ticket INT');
  });

  it('Assign ticket (admin) -> persistent notification for client + tech and gateway assigned event', async () => {
    const created = await ticketsService.create(String(clientId), {
      title: 'Ticket Assign',
      description: 'desc',
      category: 'autre' as any,
      priority: 'medium' as any,
      attachments: [],
    });

    await ticketsService.update(
      created.id,
      { assignedTo: String(techId) },
      { id: String(adminId), role: UserRole.ADMIN },
    );

    expect((gateway as any).notifyTicketAssigned).toHaveBeenCalled();

    const techNotifs = await notificationModel
      .find({ userId: techId, event: 'ticket.assigned' })
      .lean()
      .exec();
    expect(techNotifs.length).toBe(1);
    expect(techNotifs[0].title).toContain('Ticket affecté');

    const clientNotifs = await notificationModel
      .find({ userId: clientId, event: 'ticket.assigned' })
      .lean()
      .exec();
    expect(clientNotifs.length).toBe(1);
    expect(clientNotifs[0].title).toContain('Technicien affecté');
  });

  it('Unread-count endpoint logic (service) works with real MongoDB', async () => {
    await notificationsService.createMany([String(clientId)], {
      event: 'ticket.status_changed',
      ticketId: String(new Types.ObjectId()),
      title: 'x',
    });

    const { count } = await notificationsService.unreadCountForUser(
      String(clientId),
    );
    expect(count).toBeGreaterThanOrEqual(1);
  });
});


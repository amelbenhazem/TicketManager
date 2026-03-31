import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './notifications.schema';
import { User } from '../users/schemas/user.schema';

describe('NotificationsService (unit)', () => {
  let service: NotificationsService;
  type ExecResult<T> = { exec: () => Promise<T> };
  type NotificationModelMock = {
    insertMany: jest.Mock<Promise<void>, unknown[]>;
    find: jest.Mock<any, unknown[]>;
    countDocuments: jest.Mock<ExecResult<number>, unknown[]>;
    updateOne: jest.Mock<ExecResult<void>, unknown[]>;
    updateMany: jest.Mock<ExecResult<void>, unknown[]>;
  };
  type UserModelMock = {
    find: jest.Mock<any, unknown[]>;
  };

  let notificationModel: NotificationModelMock;
  let userModel: UserModelMock;

  beforeEach(async () => {
    notificationModel = {
      insertMany: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      countDocuments: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
    };
    userModel = {
      find: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: notificationModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  it('createMany(): inserts docs', async () => {
    await service.createMany(['507f1f77bcf86cd799439011'], {
      event: 'ticket.created',
      ticketId: '507f1f77bcf86cd799439012',
      title: 't',
    });
    expect(notificationModel.insertMany).toHaveBeenCalled();
  });

  it('unreadCountForUser(): returns countDocuments', async () => {
    notificationModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(5),
    });
    const res = await service.unreadCountForUser('507f1f77bcf86cd799439011');
    expect(res).toEqual({ count: 5 });
  });

  it('markAllRead(): updates many', async () => {
    notificationModel.updateMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue(undefined),
    });
    await service.markAllRead('507f1f77bcf86cd799439011');
    expect(notificationModel.updateMany).toHaveBeenCalledWith(
      { userId: expect.any(Types.ObjectId), isRead: false },
      { $set: { isRead: true } },
    );
  });

  it('createForAdmins(): finds admins then calls createMany', async () => {
    const createManySpy = jest
      .spyOn(service, 'createMany')
      .mockResolvedValue(undefined);
    userModel.find.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue([{ _id: 'a1' }, { _id: 'a2' }]),
        }),
      }),
    });
    await service.createForAdmins({
      event: 'x',
      ticketId: '507f1f77bcf86cd799439012',
      title: 't',
    });
    expect(createManySpy).toHaveBeenCalledWith(
      ['a1', 'a2'],
      expect.any(Object),
    );
  });
});

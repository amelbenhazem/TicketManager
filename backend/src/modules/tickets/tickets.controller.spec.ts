import { Test } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsAttachmentsService } from './tickets-attachments.service';
import { UserRole } from '../users/schemas/user.schema';

describe('TicketsController (unit)', () => {
  let controller: TicketsController;
  let ticketsService: {
    findAll: jest.Mock;
    findAllByAssignedTo: jest.Mock;
    findAllByUser: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    getStats: jest.Mock;
    remove: jest.Mock;
  };
  let attachmentsService: { uploadMany: jest.Mock };

  beforeEach(async () => {
    ticketsService = {
      findAll: jest.fn(),
      findAllByAssignedTo: jest.fn(),
      findAllByUser: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getStats: jest.fn(),
      remove: jest.fn(),
    };
    attachmentsService = { uploadMany: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: ticketsService },
        { provide: TicketsAttachmentsService, useValue: attachmentsService },
      ],
    }).compile();

    controller = moduleRef.get(TicketsController);
  });

  it('GET /tickets (admin) -> calls findAll', async () => {
    ticketsService.findAll.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    const req = { user: { id: 'a1', email: 'a', role: UserRole.ADMIN } };
    await controller.findTickets(
      req as any,
      '1',
      '20',
      'open',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'x',
    );
    expect(ticketsService.findAll).toHaveBeenCalled();
    expect(ticketsService.findAllByUser).not.toHaveBeenCalled();
  });

  it('GET /tickets (technician) -> calls findAllByAssignedTo', async () => {
    ticketsService.findAllByAssignedTo.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    const req = { user: { id: 't1', email: 't', role: UserRole.TECHNICIAN } };
    await controller.findTickets(req as any, '1', '20');
    expect(ticketsService.findAllByAssignedTo).toHaveBeenCalledWith(
      't1',
      1,
      20,
      expect.any(Object),
    );
  });

  it('GET /tickets (client) -> calls findAllByUser', async () => {
    ticketsService.findAllByUser.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    const req = { user: { id: 'c1', email: 'c', role: UserRole.CLIENT } };
    await controller.findTickets(req as any, '1', '20');
    expect(ticketsService.findAllByUser).toHaveBeenCalledWith(
      'c1',
      1,
      20,
      expect.any(Object),
    );
  });

  it('POST /tickets -> calls create', async () => {
    ticketsService.create.mockResolvedValue({ id: 't1' });
    const req = { user: { id: 'c1', email: 'c', role: UserRole.CLIENT } };
    const dto = { title: 'X' };
    const res = await controller.create(req as any, dto as any);
    expect(ticketsService.create).toHaveBeenCalledWith('c1', dto);
    expect(res).toEqual({ id: 't1' });
  });

  it('DELETE /tickets/:id -> calls remove', async () => {
    ticketsService.remove.mockResolvedValue({ success: true });
    const res = await controller.remove('t1');
    expect(ticketsService.remove).toHaveBeenCalledWith('t1');
    expect(res).toEqual({ success: true });
  });
});

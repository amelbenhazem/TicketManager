import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from './schemas/user.schema';

describe('UsersController (unit)', () => {
  let controller: UsersController;
  let usersService: {
    findAll: jest.Mock;
    getStats: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      getStats: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('GET /users -> delegates to UsersService.findAll', async () => {
    usersService.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await controller.findAll(UserRole.TECHNICIAN, 'x', '1', '20');
    expect(usersService.findAll).toHaveBeenCalledWith({ role: UserRole.TECHNICIAN, search: 'x' }, 1, 20);
  });

  it('POST /users -> delegates to UsersService.create', async () => {
    usersService.create.mockResolvedValue({ id: 'u1' });
    const dto = { email: 'a@a.tn', password: 'x', firstName: 'A', lastName: 'B', role: UserRole.CLIENT };
    const res = await controller.create(dto as any);
    expect(usersService.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 'u1' });
  });
});


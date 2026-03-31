import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from './schemas/user.schema';
import { Ticket } from '../tickets/schemas/ticket.schema';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService (unit)', () => {
  let service: UsersService;
  let userModel: any;
  let ticketModel: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    ticketModel = {
      countDocuments: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Ticket.name), useValue: ticketModel },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('create(): throws ConflictException if email exists', async () => {
    userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'u1' }) });
    await expect(
      service.create({ email: 'x', password: 'p', firstName: 'a', lastName: 'b', role: UserRole.CLIENT } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('create(): hashes password and creates user', async () => {
    userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    userModel.create.mockResolvedValue({ _id: 'u1', email: 'x', role: UserRole.ADMIN, firstName: 'a', lastName: 'b' });
    const res = await service.create({ email: 'x', password: 'p', firstName: 'a', lastName: 'b', role: UserRole.ADMIN } as any);
    expect(bcrypt.hash).toHaveBeenCalledWith('p', 10);
    expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({ password: 'hashed' }));
    expect(res).toMatchObject({ id: 'u1', email: 'x', role: UserRole.ADMIN });
  });

  it('findOne(): throws NotFoundException if missing', async () => {
    userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove(): technician with assigned tickets -> ConflictException', async () => {
    userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 't1', role: UserRole.TECHNICIAN }) });
    ticketModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(2) });
    await expect(service.remove('t1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('findAll(): builds search regex query', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'u1', email: 'a', role: UserRole.CLIENT, firstName: 'A', lastName: 'B' }]),
    };
    userModel.find.mockReturnValue(chain);
    userModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
    const res = await service.findAll({ search: 'abc' }, 1, 20);
    expect(userModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [
          { email: { $regex: 'abc', $options: 'i' } },
          { firstName: { $regex: 'abc', $options: 'i' } },
          { lastName: { $regex: 'abc', $options: 'i' } },
        ],
      }),
    );
    expect(res.total).toBe(1);
  });
});


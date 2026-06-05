import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock };
  let config: { get: jest.Mock<unknown, [string, ...unknown[]]> };
  let usersService: {
    findByEmail: jest.Mock;
    validatePassword: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
    config = { get: jest.fn((_key: string, fallback?: string) => fallback) };
    usersService = {
      findByEmail: jest.fn(),
      validatePassword: jest.fn(),
      findOne: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('login(): admin en base -> JWT avec sub = ObjectId', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'jwt.expiresIn') return '24h';
      return fallback;
    });
    usersService.findByEmail.mockResolvedValue({
      _id: 'admin-id-1',
      role: UserRole.ADMIN,
    });
    usersService.validatePassword.mockResolvedValue(true);

    const res = await service.login({
      email: 'admin@rfc.com',
      password: 'Admin123!',
    });
    expect(res).toEqual({
      access_token: 'jwt-token',
      expiresIn: '24h',
      role: UserRole.ADMIN,
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'admin-id-1',
        email: 'admin@rfc.com',
        role: UserRole.ADMIN,
      }),
      expect.objectContaining({ expiresIn: '24h' }),
    );
  });

  it('login(): uses configured jwt.expiresIn when present', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'jwt.expiresIn') return '12h';
      return fallback;
    });
    usersService.findByEmail.mockResolvedValue({
      _id: 'u1',
      role: UserRole.CLIENT,
    });
    usersService.validatePassword.mockResolvedValue(true);

    await service.login({ email: 'c@ex.tn', password: 'p' });
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ expiresIn: '12h' }),
    );
  });

  it('login(): db user -> returns role and signs jwt', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'jwt.expiresIn') return '24h';
      return fallback;
    });

    usersService.findByEmail.mockResolvedValue({
      _id: 'u1',
      role: UserRole.TECHNICIAN,
    });
    usersService.validatePassword.mockResolvedValue(true);

    const res = await service.login({ email: 'tech@ex.tn', password: 'pass' });
    expect(res.role).toBe(UserRole.TECHNICIAN);
    expect(res.expiresIn).toBe('24h');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'u1',
        email: 'tech@ex.tn',
        role: UserRole.TECHNICIAN,
      }),
      expect.objectContaining({ expiresIn: '24h' }),
    );
  });

  it('login(): wrong password -> UnauthorizedException', async () => {
    usersService.findByEmail.mockResolvedValue({
      _id: 'u1',
      role: UserRole.CLIENT,
    });
    usersService.validatePassword.mockResolvedValue(false);

    await expect(
      service.login({ email: 'c@ex.tn', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login(): unknown email -> UnauthorizedException', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'demo@rfc.tn', password: 'demo123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

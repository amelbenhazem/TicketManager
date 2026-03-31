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
    config = { get: jest.fn() };
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

  it('login(): demo user -> returns ADMIN + 24h and signs jwt', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'auth.demoEmail') return 'demo@rfc.tn';
      if (key === 'auth.demoPassword') return 'demo123';
      if (key === 'jwt.expiresIn') return undefined;
      // AuthService uses config.get('jwt.expiresIn', '24h')
      if (key === 'jwt.expiresIn' && fallback) return fallback;
      return fallback;
    });

    const res = await service.login({
      email: 'demo@rfc.tn',
      password: 'demo123',
    });
    expect(res).toEqual({
      access_token: 'jwt-token',
      expiresIn: '24h',
      role: UserRole.ADMIN,
    });
    expect(jwtService.sign).toHaveBeenCalledTimes(1);
    const [payload, opts] = jwtService.sign.mock.calls[0];
    expect(payload).toMatchObject({
      sub: 'demo@rfc.tn',
      email: 'demo@rfc.tn',
      role: UserRole.ADMIN,
    });
    expect(opts).toMatchObject({ expiresIn: '24h' });
  });

  it('login(): uses configured jwt.expiresIn when present', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'auth.demoEmail') return 'demo@rfc.tn';
      if (key === 'auth.demoPassword') return 'demo123';
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
      if (key === 'auth.demoEmail') return 'demo@rfc.tn';
      if (key === 'auth.demoPassword') return 'demo123';
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
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'auth.demoEmail') return 'demo@rfc.tn';
      if (key === 'auth.demoPassword') return 'demo123';
      return fallback;
    });

    usersService.findByEmail.mockResolvedValue({
      _id: 'u1',
      role: UserRole.CLIENT,
    });
    usersService.validatePassword.mockResolvedValue(false);

    await expect(
      service.login({ email: 'c@ex.tn', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

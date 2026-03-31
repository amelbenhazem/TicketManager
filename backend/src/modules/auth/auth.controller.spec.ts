import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController (unit)', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock; getProfile: jest.Mock };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      getProfile: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('POST /auth/login delegates to AuthService.login', async () => {
    authService.login.mockResolvedValue({
      access_token: 't',
      expiresIn: '24h',
      role: 'admin',
    });

    const dto = { email: 'a@a.tn', password: 'x' };
    const res = await controller.login(dto as any);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ access_token: 't', expiresIn: '24h', role: 'admin' });
  });

  it('GET /auth/me delegates to AuthService.getProfile', async () => {
    authService.getProfile.mockResolvedValue({ id: 'u1' });
    const req = { user: { id: 'u1', email: 'a', role: 'admin' } };
    const res = await controller.me(req as any);
    expect(authService.getProfile).toHaveBeenCalledWith('u1');
    expect(res).toEqual({ id: 'u1' });
  });
});

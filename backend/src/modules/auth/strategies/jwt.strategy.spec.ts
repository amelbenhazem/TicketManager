import { JwtStrategy } from './jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy (unit)', () => {
  it('validate(): throws if payload.sub missing', () => {
    const config = { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService;
    const s = new JwtStrategy(config);
    expect(() => s.validate({ sub: '' as any, email: 'x', role: 'admin' } as any)).toThrow(
      UnauthorizedException,
    );
  });

  it('validate(): returns user object', () => {
    const config = { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService;
    const s = new JwtStrategy(config);
    const res = s.validate({ sub: 'u1', email: 'x', role: 'admin' } as any);
    expect(res).toEqual({ id: 'u1', email: 'x', role: 'admin' });
  });
});


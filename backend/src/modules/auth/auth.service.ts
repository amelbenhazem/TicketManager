import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { LoginDto } from './dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthResult {
  access_token: string;
  expiresIn: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const { user, role } = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const payload: JwtPayload = {
      sub: user,
      email: dto.email,
      role,
    };
    const expiresIn = (this.config.get<string>('jwt.expiresIn', '7d') ||
      '7d') as StringValue;
    const access_token = this.jwtService.sign(payload, { expiresIn });

    return { access_token, expiresIn, role };
  }

  /**
   * Valide : d'abord compte démo (admin), sinon utilisateur en base.
   */
  private async validateUser(
    email: string,
    password: string,
  ): Promise<{ user: string | null; role: string }> {
    const demoEmail =
      this.config.get<string>('auth.demoEmail') ?? 'demo@rfc.tn';
    const demoPassword =
      this.config.get<string>('auth.demoPassword') ?? 'demo123';
    if (email === demoEmail && password === demoPassword) {
      return { user: email, role: UserRole.ADMIN };
    }

    const found = await this.usersService.findByEmail(email);
    if (!found) return { user: null, role: '' };
    const valid = await this.usersService.validatePassword(found, password);
    if (!valid) return { user: null, role: '' };
    const userId = found._id != null ? String(found._id) : null;
    return {
      user: userId,
      role: found.role,
    };
  }
}

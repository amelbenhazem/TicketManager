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

  async getProfile(
    userId: string,
  ): Promise<import('../users/users.service').UserResponse> {
    return this.usersService.findOne(userId);
  }

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
    const expiresIn = (this.config.get<string>('jwt.expiresIn', '24h') ||
      '24h') as StringValue;
    const access_token = this.jwtService.sign(payload, { expiresIn });

    return { access_token, expiresIn, role };
  }

  /** Authentification uniquement via utilisateurs en base (bcrypt). */
  private async validateUser(
    email: string,
    password: string,
  ): Promise<{ user: string | null; role: string }> {
    const found = await this.usersService.findByEmail(email);
    if (found == null) return { user: null, role: '' };
    const valid = await this.usersService.validatePassword(found, password);
    if (valid !== true) return { user: null, role: '' };
    const userId = found._id != null ? String(found._id) : null;
    return {
      user: userId,
      role: found.role,
    };
  }
}

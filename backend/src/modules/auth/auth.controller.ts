import { Controller, Post, Get, Body, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { AuthService, AuthResult } from './auth.service';
import { LoginDto } from './dto';
import { Public } from '../../common/decorators';

type RequestWithUser = Request & { user: { id: string; email: string; role: string } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @Get('me')
  async me(@Request() req: RequestWithUser) {
    return this.authService.getProfile(req.user.id);
  }
}

import { Body, Controller, Post, Headers } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { RegisterSchema } from './dto/register.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { LoginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { RefreshSchema } from './dto/refresh.dto.js';
import type { RefreshDto } from './dto/refresh.dto.js';
import { LogoutSchema } from './dto/logout.dto.js';
import type { LogoutDto } from './dto/logout.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ register: { limit: 3, ttl: 3600000 } })
  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @Throttle({ login: { limit: 10, ttl: 900000 } })
  login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    @Headers('user-agent') deviceInfo?: string,
  ) {
    return this.authService.login(dto, deviceInfo);
  }

  @Post('refresh')
  @Public()
  refresh(@Body(new ZodValidationPipe(RefreshSchema)) dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  logout(@Body(new ZodValidationPipe(LogoutSchema)) dto: LogoutDto) {
    return this.authService.logout(dto);
  }
}

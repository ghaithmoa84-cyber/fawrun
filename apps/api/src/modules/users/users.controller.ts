import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CONFIG } from '@fawrun/shared-constants';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = CONFIG.PAGINATION_DEFAULT_LIMIT,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(
      CONFIG.PAGINATION_MAX_LIMIT,
      Math.max(1, Number(limit) || CONFIG.PAGINATION_DEFAULT_LIMIT),
    );
    return this.usersService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id/verify')
  async verify(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.usersService.verify(id, user.userId);
  }

  @Put(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.usersService.reject(id, user.userId);
  }

  @Put(':id/suspend')
  async suspend(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.usersService.suspend(id, user.userId);
  }
}

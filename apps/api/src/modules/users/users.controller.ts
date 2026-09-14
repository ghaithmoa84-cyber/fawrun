import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CONFIG } from '@fawrun/shared-constants';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CuidParamSchema, type CuidParamRequest } from '@fawrun/shared-types';

@Controller('admin/users')
@UseGuards(VerifiedUserGuard, RolesGuard)
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
  async findOne(
    @Param(new ZodValidationPipe(CuidParamSchema)) params: CuidParamRequest,
  ) {
    return this.usersService.findOne(params.id);
  }

  @Put(':id/verify')
  async verify(
    @Param(new ZodValidationPipe(CuidParamSchema)) params: CuidParamRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.usersService.verify(params.id, user.userId);
  }

  @Put(':id/reject')
  async reject(
    @Param(new ZodValidationPipe(CuidParamSchema)) params: CuidParamRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.usersService.reject(params.id, user.userId);
  }

  @Put(':id/suspend')
  async suspend(
    @Param(new ZodValidationPipe(CuidParamSchema)) params: CuidParamRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.usersService.suspend(params.id, user.userId);
  }
}

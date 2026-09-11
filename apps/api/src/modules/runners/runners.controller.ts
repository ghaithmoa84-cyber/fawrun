import { Body, Controller, Get, Post, Put, Param, Query, UseGuards } from '@nestjs/common';
import { RunnersService } from './runners.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CONFIG } from '@fawrun/shared-constants';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  CreateRunnerSchema,
  UpdateRunnerSchema,
  UpdateVisibilitySchema,
  type CreateRunnerRequest,
  type UpdateRunnerRequest,
  type UpdateVisibilityRequest,
} from '@fawrun/shared-types';

@Controller('admin/runners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RunnersController {
  constructor(private readonly runnersService: RunnersService) {}

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
    return this.runnersService.findAll(pageNum, limitNum);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateRunnerSchema)) body: CreateRunnerRequest,
    @CurrentUser() user: { id: string; role: string; status: string },
  ) {
    return this.runnersService.create({
      name: body.name,
      whatsapp: body.whatsapp,
      password: body.password,
      altPhone: body.altPhone,
    }, user.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRunnerSchema)) body: UpdateRunnerRequest,
    @CurrentUser() user: { id: string; role: string; status: string },
  ) {
    return this.runnersService.update({
      id,
      name: body.name,
      altPhone: body.altPhone,
      notes: body.notes,
      password: body.password,
    }, user.id);
  }

  @Put(':id/visibility')
  async updateVisibility(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateVisibilitySchema)) body: UpdateVisibilityRequest,
    @CurrentUser() user: { id: string; role: string; status: string },
  ) {
    return this.runnersService.updateVisibility({
      id,
      isVisible: body.isVisible,
    }, user.id);
  }
}

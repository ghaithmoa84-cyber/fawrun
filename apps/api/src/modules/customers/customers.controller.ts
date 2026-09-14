import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  UpdateCustomerAddressSchema,
  UpdateCustomerSchema,
} from '@fawrun/shared-types';
import type {
  UpdateCustomerAddressRequest,
  UpdateCustomerRequest,
} from '@fawrun/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CustomersService } from './customers.service.js';

@Controller()
@UseGuards(VerifiedUserGuard, RolesGuard)
@Roles('CUSTOMER')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('customer/me')
  async getProfile(
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.customersService.getProfile(user.userId);
  }

  @Put('customer/me')
  async updateProfile(
    @Body(new ZodValidationPipe(UpdateCustomerSchema))
    dto: UpdateCustomerRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.customersService.updateProfile(user.userId, dto);
  }

  @Get('customer/me/address')
  async getAddress(
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.customersService.getAddress(user.userId);
  }

  @Put('customer/me/address')
  async updateAddress(
    @Body(new ZodValidationPipe(UpdateCustomerAddressSchema))
    dto: UpdateCustomerAddressRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.customersService.updateAddress(user.userId, dto);
  }

  @Get('customer/runners')
  async listAvailableRunners() {
    return this.customersService.listAvailableRunners();
  }
}

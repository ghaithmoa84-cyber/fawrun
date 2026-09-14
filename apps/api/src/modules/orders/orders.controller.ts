import { z } from 'zod';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AdminOrdersQuerySchema,
  ApproveOrderSchema,
  CreateOrderSchema,
  CustomerOrdersQuerySchema,
  IdParamSchema,
  RejectOrderSchema,
  StartOrderReviewSchema,
} from '@fawrun/shared-types';
import type {
  AdminOrdersQuery,
  ApproveOrderRequest,
  CreateOrderRequest,
  CustomerOrdersQuery,
  IdParamRequest,
  RejectOrderRequest,
  StartOrderReviewRequest,
} from '@fawrun/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { OrdersService } from './orders.service.js';

const AssignRunnerSchema = z.object({
  runnerId: z.string().min(1, 'Runner ID is required'),
});

const CancelOrderSchema = z.object({
  cancelReason: z.string().min(1, 'Cancel reason must be at least 1 character').optional(),
});

type AssignRunnerRequest = z.infer<typeof AssignRunnerSchema>;
type CancelOrderRequest = z.infer<typeof CancelOrderSchema>;

@Controller()
@UseGuards(VerifiedUserGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('customer/orders')
  @Roles('CUSTOMER')
  async create(
    @Body(new ZodValidationPipe(CreateOrderSchema)) dto: CreateOrderRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.createOrder(user.userId, dto);
  }

  @Get('customer/orders')
  @Roles('CUSTOMER')
  async listCustomerOrders(
    @Query(new ZodValidationPipe(CustomerOrdersQuerySchema))
    query: CustomerOrdersQuery,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.listCustomerOrders(
      user.userId,
      query.page,
      query.limit,
      query.status,
    );
  }

  @Get('customer/orders/:id')
  @Roles('CUSTOMER')
  async getOrderDetails(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.getOrderDetails(params.id, user.userId);
  }

  @Delete('customer/orders/:id')
  @Roles('CUSTOMER')
  async cancelOrder(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.cancelOrder(params.id, user.userId);
  }

  @Get('admin/orders')
  @Roles('ADMIN')
  async listAdminOrders(
    @Query(new ZodValidationPipe(AdminOrdersQuerySchema))
    query: AdminOrdersQuery,
  ) {
    return this.ordersService.listAdminOrders(query);
  }

  @Get('admin/orders/:id/audit')
  @Roles('ADMIN')
  async getAdminOrderAudit(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
  ) {
    return this.ordersService.getAdminOrderAudit(params.id);
  }

  @Get('admin/orders/:id')
  @Roles('ADMIN')
  async getAdminOrderDetails(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
  ) {
    return this.ordersService.getAdminOrderDetails(params.id);
  }

  @Put('admin/orders/:id/approve')
  @Roles('ADMIN')
  async approveOrder(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
    @Body(new ZodValidationPipe(ApproveOrderSchema))
    dto: ApproveOrderRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.approveOrder(params.id, user.userId, dto);
  }

  @Put('admin/orders/:id/reject')
  @Roles('ADMIN')
  async rejectOrder(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
    @Body(new ZodValidationPipe(RejectOrderSchema))
    dto: RejectOrderRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.rejectOrder(params.id, user.userId, dto);
  }

  @Put('admin/orders/:id/start-review')
  @Roles('ADMIN')
  async startOrderReview(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
    @Body(new ZodValidationPipe(StartOrderReviewSchema))
    dto: StartOrderReviewRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.startOrderReview(params.id, user.userId, dto);
  }

  @Put('admin/orders/:id/assign-runner')
  @Roles('ADMIN')
  async assignRunner(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
    @Body(new ZodValidationPipe(AssignRunnerSchema))
    dto: AssignRunnerRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.assignRunner(params.id, user.userId, dto.runnerId);
  }

  @Put('admin/orders/:id/cancel')
  @Roles('ADMIN')
  async cancelOrderAdmin(
    @Param(new ZodValidationPipe(IdParamSchema)) params: IdParamRequest,
    @Body(new ZodValidationPipe(CancelOrderSchema))
    dto: CancelOrderRequest,
    @CurrentUser() user: { userId: string; role: string; status: string },
  ) {
    return this.ordersService.cancelOrderAdmin(
      params.id,
      user.userId,
      dto.cancelReason,
    );
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { OrderStatus } from '@fawrun/shared-constants';
import {
  ApproveOrderRequest,
  RejectOrderRequest,
  StartOrderReviewRequest,
} from '@fawrun/shared-types';
import type {
  AdminOrderApprovalResult,
  AdminOrderRejectionResult,
} from '@fawrun/shared-types';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { PricingService } from '../../pricing/pricing.service.js';
import { OrderStateMachine } from '../../../state-machine/order-state-machine.js';
import { RunnerStateMachine } from '../../../state-machine/runner-state-machine.js';

@Injectable()
export class AdminOrderCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pricingService: PricingService,
    private readonly orderStateMachine: OrderStateMachine,
    private readonly runnerStateMachine: RunnerStateMachine,
  ) {}

  async approveOrder(
    orderId: string,
    adminId: string,
    dto: ApproveOrderRequest,
  ): Promise<AdminOrderApprovalResult> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            preferredRunner: true,
            customer: true,
            orderStores: true,
          },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const targetStatus =
          order.preferredRunnerId &&
          order.waitForPreferred &&
          order.preferredRunner?.status !== 'AVAILABLE'
            ? 'AWAITING_PREFERRED_RUNNER'
            : 'AWAITING_RUNNER';

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          targetStatus,
          'ADMIN',
        );

        const newFee = this.pricingService.calculateFee({
          isPeripheral: dto.isPeripheral,
          purchasedStoreCount: order.orderStores.length,
        });
        const oldFee = {
          baseFee: order.baseFee,
          peripheralFee: order.peripheralFee,
          extraStoresFee: order.extraStoresFee,
          totalFee: order.totalFee,
        };
        const feeChanged =
          order.isPeripheral !== dto.isPeripheral ||
          oldFee.baseFee !== newFee.baseFee ||
          oldFee.peripheralFee !== newFee.peripheralFee ||
          oldFee.extraStoresFee !== newFee.extraStoresFee ||
          oldFee.totalFee !== newFee.totalFee;

        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            isPeripheral: dto.isPeripheral,
            status: transitionResult.to,
            ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
            ...(feeChanged
              ? {
                  baseFee: newFee.baseFee,
                  peripheralFee: newFee.peripheralFee,
                  extraStoresFee: newFee.extraStoresFee,
                  totalFee: newFee.totalFee,
                }
              : {}),
          },
        });
        if (updated.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }
        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
        });

        await this.auditService.log(
          {
            orderId: order.id,
            actorId: adminId,
            actorRole: 'ADMIN',
            event: 'ORDER_APPROVED',
            fromStatus: order.status,
            toStatus: targetStatus,
            meta: {
              orderNumber: order.orderNumber,
              isPeripheral: dto.isPeripheral,
              notes: dto.notes ?? null,
            },
          },
          tx,
        );

        if (dto.isPeripheral) {
          await this.auditService.log(
            {
              orderId: order.id,
              actorId: adminId,
              actorRole: 'ADMIN',
              event: 'ORDER_PERIPHERAL_SET',
              fromStatus: order.status,
              toStatus: targetStatus,
              meta: { orderNumber: order.orderNumber },
            },
            tx,
          );
        }

        if (feeChanged) {
          await this.auditService.log(
            {
              orderId: order.id,
              actorId: adminId,
              actorRole: 'ADMIN',
              event: 'ORDER_FEE_UPDATED',
              fromStatus: order.status,
              toStatus: targetStatus,
              meta: {
                orderNumber: order.orderNumber,
                oldFee,
                newFee,
                reason: 'ADMIN_APPROVAL',
              },
            },
            tx,
          );
        }

        return {
          order: updatedOrder,
          customerId: order.customerId,
          customerUserId: order.customer.userId,
          feeChanged,
          oldFee,
          newFee,
          oldStatus: order.status,
        };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.customerUserId,
        'order:status_changed',
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          newStatus: result.order.status,
          oldStatus: result.oldStatus,
        },
        'status_update',
      );

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        newStatus: result.order.status,
      }, 'status_update');

      if (result.feeChanged) {
        const feePayload = {
          orderId: result.order.id,
          oldFee: result.oldFee.totalFee,
          newFee: result.newFee.totalFee,
          reason: 'ADMIN_APPROVAL',
        };

        await this.notificationsService.emitToCustomer(
          result.customerUserId,
          'order:fee_updated',
          feePayload,
          'status_update',
        );

        await this.notificationsService.emitToAdmin(
          'order:fee_updated',
          feePayload,
          'status_update',
        );
      }
    } catch {
      void 0;
    }

    return {
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber!,
        status: result.order.status,
      },
      customerId: result.customerId,
      feeChanged: result.feeChanged,
      oldFee: result.oldFee,
      newFee: result.newFee,
    };
  }

  async rejectOrder(
    orderId: string,
    adminId: string,
    dto: RejectOrderRequest,
  ): Promise<AdminOrderRejectionResult> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { customer: true },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'CANCELLED',
          'ADMIN',
        );

        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            status: transitionResult.to,
            cancelledByUserId: adminId,
            cancelledAt: new Date(),
            cancelReason: dto.cancelReason ?? null,
          },
        });
        if (updated.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }
        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
        });

        await this.auditService.log(
          {
            orderId: order.id,
            actorId: adminId,
            actorRole: 'ADMIN',
            event: 'ORDER_REJECTED',
            fromStatus: order.status,
            toStatus: 'CANCELLED',
            meta: {
              orderNumber: order.orderNumber,
              cancelReason: dto.cancelReason ?? null,
            },
          },
          tx,
        );

        return {
          order: updatedOrder,
          customerId: order.customerId,
          customerUserId: order.customer.userId,
        };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.customerUserId,
        'order:cancelled',
        {
          orderId: result.order.id,
          reason: dto.cancelReason ?? 'Order rejected by admin',
          cancelledBy: adminId,
        },
        'status_update',
      );

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        newStatus: result.order.status,
      }, 'status_update');
    } catch {
      void 0;
    }

    return {
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber!,
        status: result.order.status,
        cancelledAt: result.order.cancelledAt,
      },
      customerId: result.customerId,
    };
  }

  async startOrderReview(
    orderId: string,
    adminId: string,
    dto: StartOrderReviewRequest,
  ): Promise<{ order: { id: string; orderNumber: string; status: string } }> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { customer: true },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'UNDER_REVIEW',
          'ADMIN',
        );

        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            status: transitionResult.to,
            reviewedAt: new Date(),
          },
        });
        if (updated.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }
        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
        });

        await this.auditService.log(
          {
            orderId: order.id,
            actorId: adminId,
            actorRole: 'ADMIN',
            event: 'ORDER_REVIEW_STARTED',
            fromStatus: order.status,
            toStatus: transitionResult.to,
            meta: {
              orderNumber: order.orderNumber,
              notes: dto.notes ?? null,
            },
          },
          tx,
        );

        return { order: updatedOrder, customerId: order.customerId, customerUserId: order.customer.userId, oldStatus: order.status };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.customerUserId,
        'order:status_changed',
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          newStatus: result.order.status,
          oldStatus: result.oldStatus,
        },
        'status_update',
      );

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        newStatus: result.order.status,
      }, 'status_update');
    } catch {
      void 0;
    }

    return {
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber!,
        status: result.order.status,
      },
    };
  }

  async assignRunner(
    orderId: string,
    adminId: string,
    runnerId: string,
  ): Promise<{ order: { id: string; orderNumber: string; status: string } }> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { runner: true },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const runner = await tx.runner.findUnique({
          where: { id: runnerId },
          include: { user: true },
        });

        if (
          !runner ||
          runner.status !== 'AVAILABLE' ||
          runner.user?.status !== 'VERIFIED'
        ) {
          throw new UnprocessableEntityException(
            'Runner not available or not verified',
          );
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'ASSIGNED',
          'ADMIN',
        );

        this.runnerStateMachine.transition(
          runner.status,
          'ON_MISSION',
          'SYSTEM',
        );

        const updated = await tx.runner.updateMany({
          where: { id: runnerId, status: runner.status },
          data: { status: 'ON_MISSION' },
        });
        if (updated.count === 0) {
          throw new UnprocessableEntityException('RUNNER_NOT_AVAILABLE');
        }

        const updatedOrder = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            status: transitionResult.to,
            runnerId,
            assignedAt: new Date(),
          },
        });
        if (updatedOrder.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }
        const orderRecord = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: {
            customer: {
              include: { user: true },
            },
            items: {
              orderBy: { createdAt: 'asc' },
            },
            orderStores: true,
          },
        });

        await this.auditService.log(
          {
            orderId: order.id,
            actorId: adminId,
            actorRole: 'ADMIN',
            event: 'RUNNER_ASSIGNED',
            fromStatus: order.status,
            toStatus: transitionResult.to,
            meta: {
              orderNumber: order.orderNumber,
              runnerId: runnerId,
              previousRunnerId: order.runnerId,
            },
          },
          tx,
        );

        return {
          order: orderRecord,
          oldStatus: order.status,
          oldRunnerUserId: order.runner?.userId ?? null,
          runnerUserId: runner.user.id,
          runnerName: runner.user.name,
        };
      },
      { timeout: 15000 },
    );

    try {
      const assignedPayload = {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        customerName: result.order.customer?.user?.name ?? '',
        deliveryAddress: {
          lat: result.order.deliveryLat,
          lng: result.order.deliveryLng,
          description: result.order.deliveryDesc,
        },
        items: result.order.items.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          customStoreName: item.customStoreName,
          anyStore: item.anyStore,
        })),
        estimatedFee: {
          baseFee: result.order.baseFee,
          peripheralFee: result.order.peripheralFee,
          extraStoresFee: result.order.extraStoresFee,
          totalFee: result.order.totalFee,
          note: 'الرسم النهائي يُحدد بعد المراجعة',
        },
      };

      if (result.oldRunnerUserId) {
        await this.notificationsService.emitToRunner(
          result.oldRunnerUserId,
          'order:reassigned',
          { orderId: result.order.id },
          'status_update',
        );
      }

      await this.notificationsService.emitToRunner(
        result.runnerUserId,
        'order:assigned',
        assignedPayload,
        'new_order',
      );

      await this.notificationsService.emitToCustomer(
        result.order.customer.userId,
        'order:runner_assigned',
        {
          orderId: result.order.id,
          runnerName: result.runnerName,
        },
        'status_update',
      );

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        newStatus: result.order.status,
      }, 'status_update');
    } catch {
      void 0;
    }

    return {
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber!,
        status: result.order.status,
      },
    };
  }

  async cancelOrderAdmin(
    orderId: string,
    adminId: string,
    cancelReason?: string,
  ): Promise<{
    order: { id: string; orderNumber: string; status: string };
    cancelledAt: Date | null;
  }> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { runner: true, customer: true },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'CANCELLED',
          'ADMIN',
        );

        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            status: transitionResult.to,
            cancelledByUserId: adminId,
            cancelledAt: new Date(),
            cancelReason: cancelReason ?? null,
          },
        });
        if (updated.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }
        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
        });

        if (order.runnerId) {
          if (!order.runner) {
            throw new NotFoundException('Runner not found');
          }
          this.runnerStateMachine.transition(
            order.runner.status,
            'AVAILABLE',
            'SYSTEM',
          );
          const runnerUpdated = await tx.runner.updateMany({
            where: { id: order.runnerId, status: order.runner.status },
            data: { status: 'AVAILABLE' },
          });
          if (runnerUpdated.count === 0) {
            throw new UnprocessableEntityException('RUNNER_NOT_AVAILABLE');
          }
        }

        await this.auditService.log(
          {
            orderId: order.id,
            actorId: adminId,
            actorRole: 'ADMIN',
            event: 'ORDER_CANCELLED',
            fromStatus: order.status,
            toStatus: 'CANCELLED',
            meta: {
              orderNumber: order.orderNumber,
              cancelReason: cancelReason ?? null,
              runnerId: order.runnerId,
            },
          },
          tx,
        );

        return {
          order: updatedOrder,
          oldRunnerUserId: order.runner?.userId ?? null,
          customerId: order.customerId,
          customerUserId: order.customer.userId,
        };
      },
      { timeout: 15000 },
    );

    try {
      if (result.oldRunnerUserId) {
        await this.notificationsService.emitToRunner(
          result.oldRunnerUserId,
          'order:assignment_cancelled',
          {
            orderId: result.order.id,
            reason: cancelReason ?? 'Order cancelled by admin',
          },
          'status_update',
        );
      }

      await this.notificationsService.emitToCustomer(
        result.customerUserId,
        'order:cancelled',
        {
          orderId: result.order.id,
          reason: cancelReason ?? 'Order cancelled by admin',
          cancelledBy: adminId,
        },
        'status_update',
      );

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        newStatus: result.order.status,
      }, 'status_update');
    } catch {
      void 0;
    }

    return {
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber!,
        status: result.order.status,
      },
      cancelledAt: result.order.cancelledAt,
    };
  }

  // TODO: order:needs_attention — emit to admin when an order stays in
  // AWAITING_RUNNER (or AWAITING_PREFERRED_RUNNER) for more than 10 minutes,
  // or when any state requires manual intervention (e.g. pricing dispute,
  // runner no-show).  Not yet implemented in MVP — needs a scheduled cron job
  // (e.g. @nestjs/schedule @Cron) that queries stale orders and calls
  // notificationsService.emitToAdmin('order:needs_attention', { orderId, reason }, 'urgent').
}
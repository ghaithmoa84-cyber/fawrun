import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { OrderStatus, OrderStoreStatus } from '@fawrun/shared-constants';
import { MarkStoreSkippedRequest, DeliverOrderRequest } from '@fawrun/shared-types';
import type {
  RunnerOrderActionResponse,
  RunnerOrderStoresResponse,
  PurchaseStoreResponse,
} from '@fawrun/shared-types';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { LedgerService } from '../../ledger/ledger.service.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { PricingService, type RecalculateFeeResult } from '../../pricing/pricing.service.js';
import { OrderStateMachine } from '../../../state-machine/order-state-machine.js';
import { OrderStoreStateMachine } from '../../../state-machine/order-store-state-machine.js';
import { RunnerStateMachine } from '../../../state-machine/runner-state-machine.js';

@Injectable()
export class RunnerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly ledgerService: LedgerService,
    private readonly notificationsService: NotificationsService,
    private readonly pricingService: PricingService,
    private readonly orderStateMachine: OrderStateMachine,
    private readonly orderStoreStateMachine: OrderStoreStateMachine,
    private readonly runnerStateMachine: RunnerStateMachine,
  ) {}

  async listRunnerOrderStores(
    orderId: string,
    runnerUserId: string,
  ): Promise<RunnerOrderStoresResponse> {
    const runner = await this.prisma.runner.findUnique({
      where: { userId: runnerUserId },
    });
    if (!runner) {
      throw new NotFoundException('Runner profile not found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, runnerId: runner.id },
      include: {
        orderStores: {
          orderBy: { createdAt: 'asc' },
          include: { items: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber!,
      status: order.status,
      stores: order.orderStores.map((store) => ({
        id: store.id,
        storeName: store.storeName,
        isAnyStore: store.isAnyStore,
        status: store.status,
        isExtra: store.isExtra,
        addedBy: store.addedBy,
        purchasedAt: store.purchasedAt,
        items: store.items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          customStoreName: item.customStoreName,
          anyStore: item.anyStore,
        })),
      })),
    };
  }

  async startOrder(
    orderId: string,
    runnerUserId: string,
  ): Promise<RunnerOrderActionResponse> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const runner = await tx.runner.findUnique({
          where: { userId: runnerUserId },
          include: { user: true },
        });
        if (!runner || runner.user.status !== 'VERIFIED') {
          throw new UnprocessableEntityException('Runner is not verified');
        }
        if (runner.status !== 'ON_MISSION') {
          throw new UnprocessableEntityException('Runner is not on mission');
        }

        const order = await tx.order.findFirst({
          where: { id: orderId, runnerId: runner.id },
        });
        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'IN_PROGRESS',
          'RUNNER',
          { actorId: runnerUserId },
        );
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: { status: transitionResult.to, startedAt: new Date() },
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
            actorId: runnerUserId,
            actorRole: 'RUNNER',
            event: 'ORDER_STARTED',
            fromStatus: order.status,
            toStatus: transitionResult.to,
            meta: { orderNumber: order.orderNumber },
          },
          tx,
        );

        return { order: updatedOrder, runnerId: runner.id };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.order.customerId,
        'order:status_changed',
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          oldStatus: 'ASSIGNED',
          newStatus: result.order.status,
        },
      );
      await this.notificationsService.emitToRunner(
        result.runnerId,
        'order:status_changed',
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          newStatus: result.order.status,
        },
      );
      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
      });
    } catch {
      void 0;
    }

    return {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber!,
      status: result.order.status,
    };
  }

  async purchaseStore(
    orderId: string,
    storeId: string,
    runnerUserId: string,
  ): Promise<PurchaseStoreResponse> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const runner = await tx.runner.findUnique({
          where: { userId: runnerUserId },
          include: { user: true },
        });
        if (!runner || runner.user.status !== 'VERIFIED') {
          throw new UnprocessableEntityException('Runner is not verified');
        }
        if (runner.status !== 'ON_MISSION') {
          throw new UnprocessableEntityException('Runner is not on mission');
        }

        const order = await tx.order.findFirst({
          where: { id: orderId, runnerId: runner.id },
          include: { orderStores: true },
        });
        if (!order) {
          throw new NotFoundException('Order not found');
        }
        if (order.status !== 'IN_PROGRESS') {
          throw new UnprocessableEntityException('Order is not in progress');
        }

        const store = order.orderStores.find((item) => item.id === storeId);
        if (!store) {
          throw new NotFoundException('Order store not found');
        }
        const transitionResult = this.orderStoreStateMachine.transition(
          store.status as OrderStoreStatus,
          'PURCHASED',
          'RUNNER',
          { actorId: runnerUserId },
        );
        const updated = await tx.orderStore.updateMany({
          where: { id: store.id, status: store.status },
          data: { status: transitionResult.to, purchasedAt: new Date() },
        });
        if (updated.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }

        const feeResult = await this.pricingService.recalculateFee(order.id, tx);
        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
        });
        const updatedStore = await tx.orderStore.findUniqueOrThrow({
          where: { id: store.id },
        });
        if (!updatedOrder || !updatedStore) {
          throw new NotFoundException('Order store not found');
        }

        await this.auditService.log(
          {
            orderId: order.id,
            actorId: runnerUserId,
            actorRole: 'RUNNER',
            event: 'STORE_PURCHASED',
            fromStatus: store.status,
            toStatus: transitionResult.to,
            meta: {
              orderNumber: order.orderNumber,
              storeId: store.id,
              storeName: store.storeName,
            },
          },
          tx,
        );

        return {
          order: updatedOrder,
          orderStore: updatedStore,
          fee: feeResult.newFee,
        };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.order.customerId,
        'order:store_purchased',
        {
          orderId: result.order.id,
          storeName: result.orderStore.storeName,
        },
      );
      if (result.fee.runnerShare || result.fee.platformShare) {
        await this.notificationsService.emitToCustomer(
          result.order.customerId,
          'order:fee_updated',
          {
            orderId: result.order.id,
            orderNumber: result.order.orderNumber,
            newFee: result.fee,
            reason: 'STORE_PURCHASED',
          },
        );
      }
    } catch {
      void 0;
    }

    return {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber!,
      orderStore: {
        id: result.orderStore.id,
        status: 'PURCHASED' as const,
      },
      updatedFee: result.fee,
      customerNotified: true,
    };
  }

  async skipStore(
    orderId: string,
    storeId: string,
    runnerUserId: string,
    dto: MarkStoreSkippedRequest,
  ): Promise<RunnerOrderActionResponse> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const runner = await tx.runner.findUnique({
          where: { userId: runnerUserId },
          include: { user: true },
        });
        if (!runner || runner.user.status !== 'VERIFIED') {
          throw new UnprocessableEntityException('Runner is not verified');
        }
        if (runner.status !== 'ON_MISSION') {
          throw new UnprocessableEntityException('Runner is not on mission');
        }

        const order = await tx.order.findFirst({
          where: { id: orderId, runnerId: runner.id },
          include: { orderStores: true },
        });
        if (!order) {
          throw new NotFoundException('Order not found');
        }
        if (order.status !== 'IN_PROGRESS') {
          throw new UnprocessableEntityException('Order is not in progress');
        }

        const store = order.orderStores.find((item) => item.id === storeId);
        if (!store) {
          throw new NotFoundException('Order store not found');
        }
        const transitionResult = this.orderStoreStateMachine.transition(
          store.status as OrderStoreStatus,
          'SKIPPED',
          'RUNNER',
          { actorId: runnerUserId },
        );
        const updated = await tx.orderStore.updateMany({
          where: { id: store.id, status: store.status },
          data: { status: transitionResult.to },
        });
        if (updated.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }
        const updatedStore = await tx.orderStore.findUniqueOrThrow({
          where: { id: store.id },
        });
        await this.auditService.log(
          {
            orderId: order.id,
            actorId: runnerUserId,
            actorRole: 'RUNNER',
            event: 'STORE_SKIPPED',
            fromStatus: store.status,
            toStatus: transitionResult.to,
            meta: {
              orderNumber: order.orderNumber,
              storeId: store.id,
              storeName: store.storeName,
              reason: dto.reason ?? null,
            },
          },
          tx,
        );

        return { order, orderStore: updatedStore };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.order.customerId,
        'order:store_skipped',
        {
          orderId: result.order.id,
          storeName: result.orderStore.storeName,
        },
      );
    } catch {
      void 0;
    }

    return {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber!,
      status: result.order.status,
    };
  }

  async proceedToDelivery(
    orderId: string,
    runnerUserId: string,
  ): Promise<RunnerOrderActionResponse> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const runner = await tx.runner.findUnique({
          where: { userId: runnerUserId },
          include: { user: true },
        });
        if (!runner || runner.user.status !== 'VERIFIED') {
          throw new UnprocessableEntityException('Runner is not verified');
        }
        if (runner.status !== 'ON_MISSION') {
          throw new UnprocessableEntityException('Runner is not on mission');
        }

        const order = await tx.order.findFirst({
          where: { id: orderId, runnerId: runner.id },
          include: { orderStores: true },
        });
        if (!order) {
          throw new NotFoundException('Order not found');
        }
        if (order.status !== 'IN_PROGRESS') {
          throw new UnprocessableEntityException('Order is not in progress');
        }
        if (
          order.orderStores.length === 0 ||
          order.orderStores.some((store) => store.status === 'PENDING')
        ) {
          throw new UnprocessableEntityException(
            'All stores must be purchased or skipped before delivery',
          );
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'OUT_FOR_DELIVERY',
          'RUNNER',
          { actorId: runnerUserId },
        );
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: { status: transitionResult.to },
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
            actorId: runnerUserId,
            actorRole: 'RUNNER',
            event: 'PROCEEDED_TO_DELIVERY',
            fromStatus: order.status,
            toStatus: transitionResult.to,
            meta: { orderNumber: order.orderNumber },
          },
          tx,
        );

        return { order: updatedOrder, runnerId: runner.id };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.order.customerId,
        'order:out_for_delivery',
        { orderId: result.order.id },
      );
      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
      });
    } catch {
      void 0;
    }

    return {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber!,
      status: result.order.status,
    };
  }

  async deliverOrder(
    orderId: string,
    runnerUserId: string,
    dto: DeliverOrderRequest,
  ): Promise<
    RunnerOrderActionResponse & {
      idempotent: boolean;
      ledgerEntries: unknown[];
      runnerId: string | null;
      customerId: string;
    }
  > {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const runner = await tx.runner.findUnique({
          where: { userId: runnerUserId },
          include: { user: true },
        });
        if (!runner || runner.user.status !== 'VERIFIED') {
          throw new UnprocessableEntityException('Runner is not verified');
        }

        const order = await tx.order.findFirst({
          where: { id: orderId, runnerId: runner.id },
          include: { runner: true, customer: true, orderStores: true },
        });
        if (!order) {
          throw new NotFoundException('Order not found');
        }

        if (order.status === 'DELIVERED') {
          this.orderStateMachine.validateIdempotencyKeyForDelivered(
            order,
            dto.idempotencyKey,
          );
          if (order.idempotencyKey !== dto.idempotencyKey) {
            throw new ConflictException('Idempotency key mismatch');
          }
          return {
            order,
            idempotent: true,
            ledgerEntries: [],
            runnerId: order.runnerId,
            customerId: order.customerId,
          };
        }

        if (order.status !== 'OUT_FOR_DELIVERY') {
          throw new UnprocessableEntityException(
            'Order is not ready for delivery',
          );
        }
        if (
          order.orderStores.length === 0 ||
          order.orderStores.some((store) => store.status === 'PENDING')
        ) {
          throw new UnprocessableEntityException(
            'All stores must be purchased or skipped before delivery',
          );
        }

        this.orderStateMachine.validateIdempotencyKeyForDelivered(
          order,
          dto.idempotencyKey,
        );
        const claimed = await tx.order.updateMany({
          where: {
            id: order.id,
            status: 'OUT_FOR_DELIVERY',
            idempotencyKey: null,
          },
          data: { idempotencyKey: dto.idempotencyKey },
        });
        if (claimed.count === 0) {
          const current = await tx.order.findUnique({ where: { id: order.id } });
          if (current?.status === 'DELIVERED') {
            this.orderStateMachine.validateIdempotencyKeyForDelivered(
              current,
              dto.idempotencyKey,
            );
            if (current.idempotencyKey === dto.idempotencyKey) {
              return {
                order: current!,
                idempotent: true,
                ledgerEntries: [],
                runnerId: current.runnerId,
                customerId: current.customerId,
              };
            }
          }
          throw new ConflictException('Delivery is already being processed');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'DELIVERED',
          'RUNNER',
          { actorId: runnerUserId },
        );
        const feeResult: RecalculateFeeResult =
          await this.pricingService.recalculateFee(order.id, tx);
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            status: transitionResult.to,
            deliveredAt: new Date(),
          },
        });
        if (updated.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }
        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
        });

        if (!order.runnerId || !order.runner) {
          throw new NotFoundException('Runner not found');
        }
        const runnerTransition = this.runnerStateMachine.transition(
          order.runner.status,
          'AVAILABLE',
          'SYSTEM',
          { actorId: runnerUserId },
        );
        const runnerUpdated = await tx.runner.updateMany({
          where: { id: order.runnerId, status: order.runner.status },
          data: { status: 'AVAILABLE' },
        });
        if (runnerUpdated.count === 0) {
          throw new UnprocessableEntityException('RUNNER_NOT_AVAILABLE');
        }

        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            completedOrders: { increment: 1 },
            totalFeesPaid: { increment: feeResult.newFee.totalFee },
          },
        });

        const ledgerEntries = await this.ledgerService.createMany(
          [
            {
              type: 'ORDER_FEE_TOTAL',
              amount: feeResult.newFee.totalFee,
              description: `Order fee for ${updatedOrder.orderNumber}`,
              orderId: updatedOrder.id,
              runnerId: updatedOrder.runnerId ?? undefined,
              meta: { idempotencyKey: dto.idempotencyKey },
            },
            {
              type: 'RUNNER_SHARE',
              amount: feeResult.newFee.runnerShare,
              description: `Runner share for ${updatedOrder.orderNumber}`,
              orderId: updatedOrder.id,
              runnerId: updatedOrder.runnerId ?? undefined,
              meta: { idempotencyKey: dto.idempotencyKey },
            },
            {
              type: 'PLATFORM_SHARE',
              amount: feeResult.newFee.platformShare,
              description: `Platform share for ${updatedOrder.orderNumber}`,
              orderId: updatedOrder.id,
              runnerId: updatedOrder.runnerId ?? undefined,
              meta: { idempotencyKey: dto.idempotencyKey },
            },
          ],
          tx,
        );

        await this.auditService.log(
          {
            orderId: order.id,
            actorId: runnerUserId,
            actorRole: 'RUNNER',
            event: 'ORDER_DELIVERED',
            fromStatus: order.status,
            toStatus: transitionResult.to,
            meta: {
              orderNumber: updatedOrder.orderNumber,
              idempotencyKey: dto.idempotencyKey,
            },
          },
          tx,
        );
        await this.auditService.log(
          {
            orderId: order.id,
            actorId: runnerUserId,
            actorRole: 'SYSTEM',
            event: 'LEDGER_ENTRY_CREATED',
            meta: {
              orderNumber: updatedOrder.orderNumber,
              count: ledgerEntries.length,
              types: ledgerEntries.map((entry) => entry.type),
            },
          },
          tx,
        );
        await this.auditService.log(
          {
            actorId: runnerUserId,
            actorRole: 'SYSTEM',
            event: 'RUNNER_STATUS_CHANGED',
            fromStatus: order.runner.status,
            toStatus: runnerTransition.to,
            meta: {
              runnerId: order.runnerId,
              orderId: order.id,
            },
          },
          tx,
        );

        return {
          order: updatedOrder,
          idempotent: false,
          ledgerEntries,
          runnerId: order.runnerId,
          customerId: order.customerId,
        };
      },
      { timeout: 15000 },
    );

    if (!result.idempotent) {
      try {
        await this.notificationsService.emitToCustomer(
          result.customerId!,
          'order:delivered',
          {
            orderId: result.order!.id,
            deliveredAt: result.order!.deliveredAt,
          },
        );
        await this.notificationsService.emitToRunner(
          result.runnerId!,
          'order:delivered',
          { orderId: result.order!.id },
        );
        await this.notificationsService.emitToAdmin('order:status_changed', {
          orderId: result.order!.id,
          orderNumber: result.order!.orderNumber,
          status: result.order!.status,
        });
      } catch {
        void 0;
      }
    }

    return {
      orderId: result.order!.id,
      orderNumber: result.order!.orderNumber!,
      status: result.order!.status,
      idempotent: result.idempotent,
      ledgerEntries: result.ledgerEntries ?? [],
      runnerId: result.order!.runnerId,
      customerId: result.order!.customerId,
    };
  }
}
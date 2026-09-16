import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OrderStatus, OrderStoreStatus } from '@fawrun/shared-constants';
import { CONFIG } from '@fawrun/shared-constants';
import {
  CreateOrderRequest,
  DeliverOrderRequest,
  MarkStoreSkippedRequest,
} from '@fawrun/shared-types';
import type {
  AdminOrderApprovalResult,
  AdminOrderAuditEntry,
  AdminOrderDetails,
  AdminOrderListItem,
  AdminOrderRejectionResult,
  AdminOrdersQuery,
  ApproveOrderRequest,
  CustomerOrderDetails,
  CustomerOrderItem,
  CustomerOrderListItem,
  CustomerOrdersQuery,
  EstimatedFee,
  PaginatedResponse,
  PurchaseStoreResponse,
  RejectOrderRequest,
  RunnerOrderActionResponse,
  RunnerOrderStoresResponse,
  StartOrderReviewRequest,
} from '@fawrun/shared-types';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PricingService, type RecalculateFeeResult } from '../pricing/pricing.service.js';
import { OrderStateMachine } from '../../state-machine/order-state-machine.js';
import { OrderStoreStateMachine } from '../../state-machine/order-store-state-machine.js';
import { RunnerStateMachine } from '../../state-machine/runner-state-machine.js';

export interface CreateOrderResult {
  id: string;
  orderNumber: string;
  status: string;
  estimatedFee: EstimatedFee;
}

@Injectable()
export class OrdersService {
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

  async createOrder(
    userId: string,
    dto: CreateOrderRequest,
  ): Promise<CreateOrderResult> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const storeGroups = new Map<string, typeof dto.items>();

    for (const item of dto.items) {
      const key = item.anyStore
        ? '__any_store__'
        : (item.customStoreName ?? '').trim();
      if (!key) {
        throw new ForbiddenException(
          'Item customStoreName is required when anyStore is false',
        );
      }
      const group = storeGroups.get(key);
      if (group) {
        group.push(item);
      } else {
        storeGroups.set(key, [item]);
      }
    }

    const orderStoresData = Array.from(storeGroups.entries()).map(
      ([storeName, items]) => ({
        storeName: storeName === '__any_store__' ? 'أي متجر' : storeName,
        isAnyStore: storeName === '__any_store__',
        items: items.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          customStoreName: item.customStoreName,
          anyStore: item.anyStore,
        })),
      }),
    );

    const purchasedStoreCount = orderStoresData.length;
    const fee = this.pricingService.calculateFee({
      isPeripheral: false,
      purchasedStoreCount,
    });

    const result = await this.prisma.$transaction(
      async (tx) => {
        if (dto.preferredRunnerId) {
          const preferredRunner = await tx.runner.findUnique({
            where: { id: dto.preferredRunnerId },
            include: { user: true },
          });
          if (!preferredRunner) {
            throw new NotFoundException('Preferred runner not found');
          }
          const isPreferredRunnerActive =
            String(preferredRunner.status) !== 'SUSPENDED' &&
            preferredRunner.user.status === 'VERIFIED';
          if (!isPreferredRunnerActive) {
            throw new UnprocessableEntityException(
              'PREFERRED_RUNNER_NOT_AVAILABLE',
            );
          }
        }

        const order = await tx.order.create({
          data: {
            customerId: customer.id,
            deliveryLat: dto.deliveryAddress.lat,
            deliveryLng: dto.deliveryAddress.lng,
            deliveryDesc: dto.deliveryAddress.description,
            notes: dto.notes,
            preferredRunnerId: dto.preferredRunnerId,
            waitForPreferred: dto.waitForPreferred,
            baseFee: fee.baseFee,
            peripheralFee: fee.peripheralFee,
            extraStoresFee: fee.extraStoresFee,
            totalFee: fee.totalFee,
          },
        });

        const transitionResult = this.orderStateMachine.transition(
          'DRAFT',
          'PENDING_REVIEW',
          'CUSTOMER',
        );

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            orderNumber: `${CONFIG.ORDER_NUMBER_PREFIX}-${String(
              order.seqNumber,
            ).padStart(CONFIG.ORDER_NUMBER_PAD_LENGTH, '0')}`,
            status: transitionResult.to,
          },
        });

        for (const store of orderStoresData) {
          const orderStore = await tx.orderStore.create({
            data: {
              orderId: updatedOrder.id,
              storeName: store.storeName,
              isAnyStore: store.isAnyStore,
              status: 'PENDING',
              addedBy: 'CUSTOMER',
            },
          });

          for (const item of store.items) {
            await tx.orderItem.create({
              data: {
                orderId: updatedOrder.id,
                orderStoreId: orderStore.id,
                itemName: item.itemName,
                quantity: item.quantity,
                customStoreName: item.customStoreName,
                anyStore: item.anyStore,
              },
            });
          }
        }

        await this.auditService.log(
          {
            orderId: updatedOrder.id,
            actorId: userId,
            actorRole: 'CUSTOMER',
            event: 'ORDER_CREATED',
            fromStatus: 'DRAFT',
            toStatus: 'PENDING_REVIEW',
            meta: { orderNumber: updatedOrder.orderNumber },
          },
          tx,
        );

        await this.auditService.log(
          {
            orderId: updatedOrder.id,
            actorId: userId,
            actorRole: 'CUSTOMER',
            event: 'ORDER_SUBMITTED',
            fromStatus: 'PENDING_REVIEW',
            toStatus: 'PENDING_REVIEW',
            meta: { orderNumber: updatedOrder.orderNumber },
          },
          tx,
        );

        return { order: updatedOrder, fee };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToAdmin('order:new', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        customerId: customer.id,
        itemCount: dto.items.length,
        status: result.order.status,
        totalFee: result.fee.totalFee,
      });
    } catch {
      void 0;
    }

    return {
      id: result.order.id,
      orderNumber: result.order.orderNumber!,
      status: result.order.status,
      estimatedFee: {
        baseFee: result.fee.baseFee,
        peripheralFee: result.fee.peripheralFee,
        extraStoresFee: result.fee.extraStoresFee,
        totalFee: result.fee.totalFee,
        note: 'الرسم النهائي يُحدد بعد المراجعة',
      },
    };
  }

  async listCustomerOrders(
    userId: string,
    page: number,
    limit: number,
    status?: CustomerOrdersQuery['status'],
  ): Promise<{
    data: CustomerOrderListItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const where = {
      customerId: customer.id,
      ...(status ? { status } : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber!,
        status: order.status,
        totalFee: order.totalFee,
        itemCount: order._count.items,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderDetails(
    orderId: string,
    userId: string,
  ): Promise<CustomerOrderDetails> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: customer.id,
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        orderStores: {
          orderBy: { createdAt: 'asc' },
          include: {
            items: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        runner: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber!,
      status: order.status,
      isPeripheral: order.isPeripheral,
      baseFee: order.baseFee,
      peripheralFee: order.peripheralFee,
      extraStoresFee: order.extraStoresFee,
      totalFee: order.totalFee,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      deliveryDesc: order.deliveryDesc,
      notes: order.notes,
      preferredRunnerId: order.preferredRunnerId,
      waitForPreferred: order.waitForPreferred,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      items: order.items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        customStoreName: item.customStoreName,
        anyStore: item.anyStore,
        orderStoreId: item.orderStoreId,
        isCancelled: item.isCancelled,
        cancelNote: item.cancelNote,
        createdAt: item.createdAt,
      })),
      orderStores: order.orderStores.map((store) => ({
        id: store.id,
        storeName: store.storeName,
        isAnyStore: store.isAnyStore,
        status: store.status,
        isExtra: store.isExtra,
        addedBy: store.addedBy,
        purchasedAt: store.purchasedAt,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        items: store.items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          customStoreName: item.customStoreName,
          anyStore: item.anyStore,
          orderStoreId: item.orderStoreId,
          isCancelled: item.isCancelled,
          cancelNote: item.cancelNote,
          createdAt: item.createdAt,
        })),
      })),
      runner: order.runner
        ? {
            id: order.runner.id,
            name: order.runner.user.name,
            avgRating: order.runner.avgRating,
            totalRatings: order.runner.totalRatings,
            status: order.runner.status,
          }
        : null,
    };
  }

  async cancelOrder(orderId: string, userId: string) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { runner: true },
        });

        const customer = await tx.customer.findUnique({
          where: { userId },
        });
        if (!customer) {
          throw new NotFoundException('Customer not found');
        }
        if (!order || order.customerId !== customer.id) {
          throw new NotFoundException('Order not found');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'CANCELLED',
          'CUSTOMER',
        );

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: transitionResult.to,
            cancelledByUserId: userId,
            cancelledAt: new Date(),
          },
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
            actorId: userId,
            actorRole: 'CUSTOMER',
            event: 'ORDER_CANCELLED',
            fromStatus: order.status,
            toStatus: 'CANCELLED',
            meta: {
              orderNumber: order.orderNumber,
              runnerId: order.runnerId,
            },
          },
          tx,
        );

        return {
          order: updatedOrder,
          runnerId: order.runnerId,
        };
      },
      { timeout: 15000 },
    );

    try {
      if (result.runnerId) {
        await this.notificationsService.emitToRunner(
          result.runnerId,
          'order:cancelled',
          {
            orderId: result.order.id,
            orderNumber: result.order.orderNumber,
          },
        );
      }

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
      });
    } catch {
      void 0;
    }

    return {
      id: result.order.id,
      orderNumber: result.order.orderNumber!,
      status: result.order.status,
      cancelledAt: result.order.cancelledAt,
    };
  }

  async listAdminOrders(
    query: AdminOrdersQuery,
  ): Promise<PaginatedResponse<AdminOrderListItem>> {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.runnerId ? { runnerId: query.runnerId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            include: {
              user: true,
            },
          },
          runner: {
            include: {
              user: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber!,
        status: order.status,
        customerId: order.customerId,
        customerName: order.customer?.user.name ?? '',
        runnerId: order.runnerId,
        runnerName: order.runner?.user.name ?? null,
        totalFee: order.totalFee,
        itemCount: order._count.items,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getAdminOrderDetails(orderId: string): Promise<AdminOrderDetails> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        runner: {
          include: {
            user: true,
          },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
        orderStores: {
          orderBy: { createdAt: 'asc' },
          include: {
            items: {
              orderBy: { createdAt: 'asc' },
            },
            receipts: {
              orderBy: { uploadedAt: 'asc' },
            },
          },
        },
        ratings: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber!,
      status: order.status,
      isPeripheral: order.isPeripheral,
      baseFee: order.baseFee,
      peripheralFee: order.peripheralFee,
      extraStoresFee: order.extraStoresFee,
      totalFee: order.totalFee,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      deliveryDesc: order.deliveryDesc,
      notes: order.notes,
      preferredRunnerId: order.preferredRunnerId,
      waitForPreferred: order.waitForPreferred,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      customer: {
        id: order.customer.id,
        userId: order.customer.userId,
        name: order.customer.user.name,
        whatsapp: order.customer.user.whatsapp,
        altPhone: order.customer.user.altPhone,
        status: order.customer.user.status,
      },
      runner: order.runner
        ? {
            id: order.runner.id,
            userId: order.runner.userId,
            name: order.runner.user.name,
            status: order.runner.status,
            avgRating: order.runner.avgRating,
            totalRatings: order.runner.totalRatings,
            isVisible: order.runner.isVisible,
            notes: order.runner.notes,
          }
        : null,
      items: order.items.map((item) => this.mapOrderItem(item)),
      orderStores: order.orderStores.map((store) => ({
        id: store.id,
        storeName: store.storeName,
        isAnyStore: store.isAnyStore,
        status: store.status,
        isExtra: store.isExtra,
        addedBy: store.addedBy,
        purchasedAt: store.purchasedAt,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        items: store.items.map((item) => this.mapOrderItem(item)),
        receipts: store.receipts.map((receipt) => ({
          id: receipt.id,
          orderStoreId: receipt.orderStoreId,
          imageUrl: receipt.imageUrl,
          r2Key: receipt.r2Key,
          isDeleted: receipt.isDeleted,
          deletedAt: receipt.deletedAt,
          uploadedAt: receipt.uploadedAt,
        })),
      })),
      ratings: order.ratings.map((rating) => ({
        id: rating.id,
        orderId: rating.orderId,
        customerId: rating.customerId,
        runnerId: rating.runnerId,
        storeNameRated: rating.storeNameRated,
        stars: rating.stars,
        note: rating.note,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
        expiresAt: rating.expiresAt,
        isFinal: rating.isFinal,
      })),
    };
  }

  async getAdminOrderAudit(orderId: string): Promise<AdminOrderAuditEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map((log) => ({
      id: log.id,
      orderId: log.orderId,
      actorId: log.actorId,
      actorRole: log.actorRole,
      event: log.event,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      meta: log.meta as unknown,
      createdAt: log.createdAt,
    }));
  }

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
          purchasedStoreCount: order.orderStores.filter(
            (store) => store.status === 'PURCHASED',
          ).length,
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

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
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
          feeChanged,
          oldFee,
          newFee,
        };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.customerId,
        'order:status_changed',
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          status: result.order.status,
        },
      );

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
      });

      if (result.feeChanged) {
        const feePayload = {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          oldFee: result.oldFee,
          newFee: result.newFee,
          reason: 'ADMIN_APPROVAL',
        };

        await this.notificationsService.emitToCustomer(
          result.customerId,
          'order:fee_updated',
          feePayload,
        );

        await this.notificationsService.emitToAdmin(
          'order:fee_updated',
          feePayload,
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

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: transitionResult.to,
            cancelledByUserId: adminId,
            cancelledAt: new Date(),
            cancelReason: dto.cancelReason ?? null,
          },
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
        };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToCustomer(
        result.customerId,
        'order:cancelled',
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          status: result.order.status,
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
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'UNDER_REVIEW',
          'ADMIN',
        );

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: transitionResult.to,
            reviewedAt: new Date(),
          },
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

        return { order: updatedOrder };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
      });
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

        // Validate the runner status change through RunnerStateMachine.
        // Only SYSTEM may move a runner AVAILABLE -> ON_MISSION when an order
        // is assigned; the atomic updateMany below enforces this concurrently.
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

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: transitionResult.to,
            runnerId,
            assignedAt: new Date(),
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

        return { order: updatedOrder };
      },
      { timeout: 15000 },
    );

    try {
      await this.notificationsService.emitToRunner(
        runnerId,
        'order:assigned',
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
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
          include: { runner: true },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'CANCELLED',
          'ADMIN',
        );

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: transitionResult.to,
            cancelledByUserId: adminId,
            cancelledAt: new Date(),
            cancelReason: cancelReason ?? null,
          },
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
          runnerId: order.runnerId,
        };
      },
      { timeout: 15000 },
    );

    try {
      if (result.runnerId) {
        await this.notificationsService.emitToRunner(
          result.runnerId,
          'order:cancelled',
          {
            orderId: result.order.id,
            orderNumber: result.order.orderNumber,
          },
        );
      }

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
      });
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
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: transitionResult.to, startedAt: new Date() },
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
        await tx.orderStore.update({
          where: { id: store.id },
          data: { status: transitionResult.to, purchasedAt: new Date() },
        });

        const feeResult = await this.pricingService.recalculateFee(order.id, tx);
        const updatedOrder = await tx.order.findUnique({
          where: { id: order.id },
        });
        const updatedStore = await tx.orderStore.findUnique({
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
        const updatedStore = await tx.orderStore.update({
          where: { id: store.id },
          data: { status: transitionResult.to },
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
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: transitionResult.to },
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
      ledgerEntries?: unknown[];
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
          return { order, idempotent: true };
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
              return { order: current, idempotent: true };
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
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: transitionResult.to,
            deliveredAt: new Date(),
          },
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
            orderId: result.order.id,
            deliveredAt: result.order.deliveredAt,
          },
        );
        await this.notificationsService.emitToRunner(
          result.runnerId!,
          'order:delivered',
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
    }

    return {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber!,
      status: result.order.status,
      idempotent: result.idempotent,
      ...(result.ledgerEntries ? { ledgerEntries: result.ledgerEntries } : {}),
    };
  }

  private mapOrderItem(item: {
    id: string;
    itemName: string;
    quantity: string;
    customStoreName: string | null;
    anyStore: boolean;
    orderStoreId: string | null;
    isCancelled: boolean;
    cancelNote: string | null;
    createdAt: Date;
  }): CustomerOrderItem {
    return {
      id: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      customStoreName: item.customStoreName,
      anyStore: item.anyStore,
      orderStoreId: item.orderStoreId,
      isCancelled: item.isCancelled,
      cancelNote: item.cancelNote,
      createdAt: item.createdAt,
    };
  }
}

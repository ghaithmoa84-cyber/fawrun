import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OrderStatus } from '@fawrun/shared-constants';
import { CreateOrderRequest } from '@fawrun/shared-types';
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
  RejectOrderRequest,
  StartOrderReviewRequest,
} from '@fawrun/shared-types';
import { CONFIG } from '@fawrun/shared-constants';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { OrderStateMachine } from '../../state-machine/order-state-machine.js';

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
    private readonly notificationsService: NotificationsService,
    private readonly pricingService: PricingService,
    private readonly orderStateMachine: OrderStateMachine,
  ) {}

  async createOrder(
    customerId: string,
    dto: CreateOrderRequest,
  ): Promise<CreateOrderResult> {
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
          });
          if (!preferredRunner) {
            throw new NotFoundException('Preferred runner not found');
          }
        }

        const order = await tx.order.create({
          data: {
            customerId,
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
            actorId: customerId,
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
            actorId: customerId,
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
        customerId,
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
    customerId: string,
    page: number,
    limit: number,
    status?: CustomerOrdersQuery['status'],
  ): Promise<{
    data: CustomerOrderListItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const where = {
      customerId,
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
    customerId: string,
  ): Promise<CustomerOrderDetails> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
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

  async cancelOrder(orderId: string, customerId: string) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { runner: true },
        });

        if (!order || order.customerId !== customerId) {
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
            cancelledByUserId: customerId,
            cancelledAt: new Date(),
          },
        });

        if (order.runnerId) {
          if (order.runner && order.runner.status === 'ON_MISSION') {
            await tx.runner.updateMany({
              where: { id: order.runnerId },
              data: { status: 'AVAILABLE' },
            });
          }
        }

        await this.auditService.log(
          {
            orderId: order.id,
            actorId: customerId,
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
          purchasedStoreCount: 0,
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
        });

        if (!runner) {
          throw new NotFoundException('Runner not found');
        }

        const transitionResult = this.orderStateMachine.transition(
          order.status as OrderStatus,
          'ASSIGNED',
          'ADMIN',
        );

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: transitionResult.to,
            runnerId: runnerId,
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
          if (order.runner && order.runner.status === 'ON_MISSION') {
            await tx.runner.updateMany({
              where: { id: order.runnerId },
              data: { status: 'AVAILABLE' },
            });
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

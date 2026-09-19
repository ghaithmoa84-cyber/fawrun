import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { OrderStatus } from '@fawrun/shared-constants';
import { CONFIG } from '@fawrun/shared-constants';
import { CreateOrderRequest } from '@fawrun/shared-types';
import type {
  CreateOrderResponse,
  CustomerOrderDetails,
  CustomerOrderListItem,
  CustomerOrdersQuery,
} from '@fawrun/shared-types';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { PricingService } from '../../pricing/pricing.service.js';
import { OrderStateMachine } from '../../../state-machine/order-state-machine.js';
import { RunnerStateMachine } from '../../../state-machine/runner-state-machine.js';
import { mapOrderItem } from './order-mapper.js';

@Injectable()
export class CustomerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pricingService: PricingService,
    private readonly orderStateMachine: OrderStateMachine,
    private readonly runnerStateMachine: RunnerStateMachine,
  ) {}

  private readonly logger = new Logger(CustomerOrdersService.name);

  async createOrder(
    userId: string,
    dto: CreateOrderRequest,
  ): Promise<CreateOrderResponse> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } },
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
        throw new BadRequestException(
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

        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            orderNumber: `${CONFIG.ORDER_NUMBER_PREFIX}-${String(
              order.seqNumber,
            ).padStart(CONFIG.ORDER_NUMBER_PAD_LENGTH, '0')}`,
            status: transitionResult.to,
          },
        });
        if (updated.count === 0) {
          throw new ConflictException('ORDER_STATUS_CHANGED_CONCURRENTLY');
        }
        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
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
        customerName: customer.user?.name ?? '',
        itemCount: dto.items.length,
      }, 'new_order');
    } catch (error) {
      this.logger.warn('Notification emit failed', { error, orderId: result.order.id });
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
      items: order.items.map((item) => mapOrderItem(item)),
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
        items: store.items.map((item) => mapOrderItem(item)),
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
          include: { runner: true, customer: true },
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

        const updated = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            status: transitionResult.to,
            cancelledByUserId: userId,
            cancelledAt: new Date(),
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
          oldRunnerUserId: order.runner?.userId ?? null,
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
            reason: 'Order cancelled by customer',
          },
          'status_update',
        );
      }

      await this.notificationsService.emitToCustomer(
        result.customerUserId,
        'order:cancelled',
        {
          orderId: result.order.id,
          reason: 'Order cancelled by customer',
          cancelledBy: userId,
        },
        'status_update',
      );

      await this.notificationsService.emitToAdmin('order:status_changed', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        newStatus: result.order.status,
      }, 'status_update');
    } catch (error) {
      this.logger.warn('Notification emit failed', { error, orderId: result.order.id });
    }

    return {
      id: result.order.id,
      orderNumber: result.order.orderNumber!,
      status: result.order.status,
      cancelledAt: result.order.cancelledAt,
    };
  }
}
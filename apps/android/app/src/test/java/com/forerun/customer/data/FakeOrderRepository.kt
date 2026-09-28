package com.forerun.customer.data

import com.forerun.customer.domain.model.CreatedOrder
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.model.OrderItem
import com.forerun.customer.domain.model.RunnerInfo
import com.forerun.customer.domain.repository.OrderRepository

class FakeOrderRepository : OrderRepository {
    var createOrderResult: Result<CreatedOrder> = Result.success(
        CreatedOrder(
            id = "order_123",
            orderNumber = "ORD-001",
            status = "PENDING",
            totalFee = 5000,
            feeNote = "رسوم التوصيل الأساسية"
        )
    )

    var availableRunnersResult: Result<List<RunnerInfo>> = Result.success(
        listOf(
            RunnerInfo(id = "runner_1", name = "الكابتن أحمد", avgRating = 4.8, totalRatings = 15, status = "AVAILABLE")
        )
    )

    override suspend fun createOrder(
        items: List<OrderItem>,
        notes: String?,
        preferredRunnerId: String?,
        waitForPreferred: Boolean,
        deliveryAddress: CustomerAddress
    ): Result<CreatedOrder> = createOrderResult

    override suspend fun getAvailableRunners(): Result<List<RunnerInfo>> = availableRunnersResult

    var getCustomerOrdersResult: Result<com.forerun.customer.domain.model.OrdersPage> = Result.success(
        com.forerun.customer.domain.model.OrdersPage(
            orders = listOf(
                com.forerun.customer.domain.model.CustomerOrder(
                    id = "order_1",
                    orderNumber = "FW-000015",
                    status = "PENDING_REVIEW",
                    totalFee = 80,
                    itemCount = 3,
                    createdAt = "2026-09-28T12:48:09.688Z",
                    deliveredAt = null,
                    runnerName = null
                )
            ),
            total = 1,
            page = 1,
            limit = 20,
            totalPages = 1
        )
    )

    override suspend fun getCustomerOrders(
        page: Int,
        limit: Int,
        status: String?
    ): Result<com.forerun.customer.domain.model.OrdersPage> = getCustomerOrdersResult
}

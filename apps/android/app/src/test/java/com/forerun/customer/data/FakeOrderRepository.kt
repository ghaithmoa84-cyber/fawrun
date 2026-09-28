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
}

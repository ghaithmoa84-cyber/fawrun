package com.forerun.customer.domain.repository

import com.forerun.customer.domain.model.CreatedOrder
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.model.OrderItem
import com.forerun.customer.domain.model.RunnerInfo

interface OrderRepository {
    suspend fun createOrder(
        items: List<OrderItem>,
        notes: String?,
        preferredRunnerId: String?,
        waitForPreferred: Boolean,
        deliveryAddress: CustomerAddress
    ): Result<CreatedOrder>

    suspend fun getAvailableRunners(): Result<List<RunnerInfo>>

    suspend fun getCustomerOrders(
        page: Int = 1,
        limit: Int = 20,
        status: String? = null
    ): Result<com.forerun.customer.domain.model.OrdersPage>
}

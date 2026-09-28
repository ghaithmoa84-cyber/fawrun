package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.model.OrdersPage
import com.forerun.customer.domain.repository.OrderRepository
import javax.inject.Inject

class GetCustomerOrdersUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(
        page: Int = 1,
        limit: Int = 20,
        status: String? = null
    ): Result<OrdersPage> {
        return orderRepository.getCustomerOrders(page = page, limit = limit, status = status)
    }
}

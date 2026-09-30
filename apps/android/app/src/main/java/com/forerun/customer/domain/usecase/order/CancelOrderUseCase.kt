package com.forerun.customer.domain.usecase.order

import com.forerun.customer.domain.repository.OrderRepository
import javax.inject.Inject

class CancelOrderUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(orderId: String): Result<Unit> {
        return orderRepository.cancelOrder(orderId)
    }
}

package com.forerun.customer.domain.usecase.order

import com.forerun.customer.domain.model.CustomerOrderDetail
import com.forerun.customer.domain.repository.OrderRepository
import javax.inject.Inject

class GetOrderDetailUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(orderId: String): Result<CustomerOrderDetail> {
        return orderRepository.getOrderDetail(orderId)
    }
}

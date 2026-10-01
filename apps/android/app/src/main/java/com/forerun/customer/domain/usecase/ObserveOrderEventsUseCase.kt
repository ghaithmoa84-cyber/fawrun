package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.gateway.OrderEventsGateway
import com.forerun.customer.domain.model.WebSocketEvent
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class ObserveOrderEventsUseCase @Inject constructor(
    private val orderEventsGateway: OrderEventsGateway
) {
    operator fun invoke(): Flow<WebSocketEvent> {
        return orderEventsGateway.observeEvents()
    }

    operator fun invoke(orderId: String): Flow<WebSocketEvent> {
        return orderEventsGateway.observeEvents(orderId)
    }
}

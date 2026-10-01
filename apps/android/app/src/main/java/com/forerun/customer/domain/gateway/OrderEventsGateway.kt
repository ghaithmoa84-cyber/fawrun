package com.forerun.customer.domain.gateway

import com.forerun.customer.domain.model.WebSocketEvent
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter

interface OrderEventsGateway {
    fun observeEvents(): Flow<WebSocketEvent>

    fun observeEvents(orderId: String): Flow<WebSocketEvent> =
        observeEvents().filter { it.orderId == orderId }
}

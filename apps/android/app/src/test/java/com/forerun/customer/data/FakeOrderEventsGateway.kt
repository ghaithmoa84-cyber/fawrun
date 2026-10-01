package com.forerun.customer.data

import com.forerun.customer.domain.gateway.OrderEventsGateway
import com.forerun.customer.domain.model.WebSocketEvent
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.filter

class FakeOrderEventsGateway : OrderEventsGateway {

    private val _events = MutableSharedFlow<WebSocketEvent>(extraBufferCapacity = 64)
    val eventsFlow: Flow<WebSocketEvent> = _events.asSharedFlow()

    override fun observeEvents(): Flow<WebSocketEvent> = eventsFlow

    override fun observeEvents(orderId: String): Flow<WebSocketEvent> =
        eventsFlow.filter { it.orderId == orderId }

    suspend fun emitEvent(event: WebSocketEvent) {
        _events.emit(event)
    }

    fun tryEmitEvent(event: WebSocketEvent): Boolean {
        return _events.tryEmit(event)
    }
}

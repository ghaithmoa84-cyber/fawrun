package com.forerun.customer.domain.usecase.order

import com.forerun.customer.core.websocket.SocketManager
import com.forerun.customer.core.websocket.WebSocketEvent
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class ObserveOrderEventsUseCase @Inject constructor(
    private val socketManager: SocketManager
) {
    operator fun invoke(orderId: String): Flow<WebSocketEvent> {
        return socketManager.observeOrderEvents(orderId)
    }
}

package com.forerun.customer.data.gateway

import com.forerun.customer.core.websocket.SocketConnectionState
import com.forerun.customer.core.websocket.SocketManager
import com.forerun.customer.domain.gateway.OrderEventsGateway
import com.forerun.customer.domain.model.OrderStatus
import com.forerun.customer.domain.model.WebSocketEvent
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.merge
import javax.inject.Inject
import javax.inject.Singleton
import com.forerun.customer.core.websocket.WebSocketEvent as CoreWebSocketEvent

@Singleton
class SocketOrderEventsGateway @Inject constructor(
    private val socketManager: SocketManager
) : OrderEventsGateway {

    override fun observeEvents(): Flow<WebSocketEvent> {
        val eventFlow = socketManager.events.map { it.toDomain() }
        val connectionFlow = socketManager.connectionState
            .map { state ->
                WebSocketEvent.ConnectionStateChanged(
                    isConnected = state == SocketConnectionState.CONNECTED
                )
            }
            .distinctUntilChanged()

        return merge(eventFlow, connectionFlow)
    }

    override fun observeEvents(orderId: String): Flow<WebSocketEvent> {
        return socketManager.observeOrderEvents(orderId).map { it.toDomain() }
    }

    internal fun CoreWebSocketEvent.toDomain(): WebSocketEvent {
        return when (this) {
            is CoreWebSocketEvent.StatusChanged -> WebSocketEvent.OrderStatusChanged(
                orderId = orderId,
                status = OrderStatus.fromString(newStatus),
                orderNumber = orderNumber,
                oldStatus = oldStatus
            )
            is CoreWebSocketEvent.RunnerAssigned -> WebSocketEvent.RunnerAssigned(
                orderId = orderId,
                runnerName = runnerName
            )
            is CoreWebSocketEvent.FeeUpdated -> WebSocketEvent.FeeUpdated(
                orderId = orderId,
                oldFee = oldFee,
                newFee = newFee,
                reason = reason
            )
            is CoreWebSocketEvent.StorePurchased -> WebSocketEvent.StorePurchased(
                orderId = orderId,
                storeName = storeName
            )
            is CoreWebSocketEvent.StoreSkipped -> WebSocketEvent.StoreSkipped(
                orderId = orderId,
                storeName = storeName
            )
            is CoreWebSocketEvent.OutForDelivery -> WebSocketEvent.OutForDelivery(
                orderId = orderId
            )
            is CoreWebSocketEvent.Delivered -> WebSocketEvent.Delivered(
                orderId = orderId,
                deliveredAt = deliveredAt
            )
            is CoreWebSocketEvent.Cancelled -> WebSocketEvent.Cancelled(
                orderId = orderId,
                reason = reason,
                cancelledBy = cancelledBy
            )
            is CoreWebSocketEvent.AccountVerified -> WebSocketEvent.AccountVerified
            is CoreWebSocketEvent.RawEvent -> WebSocketEvent.RawEvent(
                eventName = eventName,
                orderId = orderId,
                data = data
            )
        }
    }
}

package com.forerun.customer.domain.model

sealed interface WebSocketEvent {
    val orderId: String? get() = null

    data class OrderStatusChanged(
        override val orderId: String,
        val status: OrderStatus,
        val orderNumber: String? = null,
        val oldStatus: String? = null
    ) : WebSocketEvent {
        val newStatus: String get() = status.name
    }

    data class RunnerAssigned(
        override val orderId: String,
        val runnerName: String
    ) : WebSocketEvent

    data class FeeUpdated(
        override val orderId: String,
        val oldFee: Int,
        val newFee: Int,
        val reason: String? = null
    ) : WebSocketEvent

    data class StorePurchased(
        override val orderId: String,
        val storeName: String
    ) : WebSocketEvent

    data class StoreSkipped(
        override val orderId: String,
        val storeName: String
    ) : WebSocketEvent

    data class OutForDelivery(
        override val orderId: String
    ) : WebSocketEvent

    data class Delivered(
        override val orderId: String,
        val deliveredAt: String? = null
    ) : WebSocketEvent

    data class Cancelled(
        override val orderId: String,
        val reason: String? = null,
        val cancelledBy: String? = null
    ) : WebSocketEvent

    data object AccountVerified : WebSocketEvent

    data class ConnectionStateChanged(
        val isConnected: Boolean
    ) : WebSocketEvent

    data class RawEvent(
        val eventName: String,
        override val orderId: String? = null,
        val data: String = ""
    ) : WebSocketEvent

    companion object {
        fun StatusChanged(
            orderId: String,
            orderNumber: String? = null,
            oldStatus: String? = null,
            newStatus: String
        ): OrderStatusChanged = OrderStatusChanged(
            orderId = orderId,
            status = OrderStatus.fromString(newStatus),
            orderNumber = orderNumber,
            oldStatus = oldStatus
        )
    }
}

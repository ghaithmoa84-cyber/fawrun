package com.forerun.customer.core.websocket

sealed interface WebSocketEvent {
    val orderId: String?

    data class StatusChanged(
        override val orderId: String,
        val orderNumber: String?,
        val oldStatus: String?,
        val newStatus: String
    ) : WebSocketEvent

    data class RunnerAssigned(
        override val orderId: String,
        val runnerName: String
    ) : WebSocketEvent

    data class FeeUpdated(
        override val orderId: String,
        val oldFee: Int,
        val newFee: Int,
        val reason: String?
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
        val deliveredAt: String?
    ) : WebSocketEvent

    data class Cancelled(
        override val orderId: String,
        val reason: String?,
        val cancelledBy: String?
    ) : WebSocketEvent

    data object AccountVerified : WebSocketEvent {
        override val orderId: String? = null
    }

    data class RawEvent(
        val eventName: String,
        override val orderId: String? = null,
        val data: String
    ) : WebSocketEvent
}

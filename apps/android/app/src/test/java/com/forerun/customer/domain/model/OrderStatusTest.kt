package com.forerun.customer.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderStatusTest {

    @Test
    fun `fromString maps all valid status strings correctly`() {
        assertEquals(OrderStatus.DRAFT, OrderStatus.fromString("DRAFT"))
        assertEquals(OrderStatus.PENDING_REVIEW, OrderStatus.fromString("pending_review"))
        assertEquals(OrderStatus.UNDER_REVIEW, OrderStatus.fromString("Under_Review"))
        assertEquals(OrderStatus.AWAITING_RUNNER, OrderStatus.fromString("AWAITING_RUNNER"))
        assertEquals(OrderStatus.AWAITING_PREFERRED_RUNNER, OrderStatus.fromString("AWAITING_PREFERRED_RUNNER"))
        assertEquals(OrderStatus.ASSIGNED, OrderStatus.fromString("assigned"))
        assertEquals(OrderStatus.IN_PROGRESS, OrderStatus.fromString("in_progress"))
        assertEquals(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.fromString("out_for_delivery"))
        assertEquals(OrderStatus.DELIVERED, OrderStatus.fromString("delivered"))
        assertEquals(OrderStatus.CANCELLED, OrderStatus.fromString("cancelled"))
    }

    @Test
    fun `fromString falls back to UNKNOWN for invalid or null input`() {
        assertEquals(OrderStatus.UNKNOWN, OrderStatus.fromString(null))
        assertEquals(OrderStatus.UNKNOWN, OrderStatus.fromString(""))
        assertEquals(OrderStatus.UNKNOWN, OrderStatus.fromString("INVALID_STATUS"))
    }

    @Test
    fun `isTerminal returns true only for DELIVERED and CANCELLED`() {
        assertTrue(OrderStatus.DELIVERED.isTerminal)
        assertTrue(OrderStatus.CANCELLED.isTerminal)

        assertFalse(OrderStatus.DRAFT.isTerminal)
        assertFalse(OrderStatus.PENDING_REVIEW.isTerminal)
        assertFalse(OrderStatus.UNDER_REVIEW.isTerminal)
        assertFalse(OrderStatus.AWAITING_RUNNER.isTerminal)
        assertFalse(OrderStatus.AWAITING_PREFERRED_RUNNER.isTerminal)
        assertFalse(OrderStatus.ASSIGNED.isTerminal)
        assertFalse(OrderStatus.IN_PROGRESS.isTerminal)
        assertFalse(OrderStatus.OUT_FOR_DELIVERY.isTerminal)
        assertFalse(OrderStatus.UNKNOWN.isTerminal)
    }

    @Test
    fun `isActive is inverse of isTerminal`() {
        for (status in OrderStatus.entries) {
            assertEquals(!status.isTerminal, status.isActive)
        }
    }

    @Test
    fun `domain WebSocketEvent covers expected sealed types`() {
        val statusChanged = WebSocketEvent.OrderStatusChanged(
            orderId = "order_1",
            status = OrderStatus.ASSIGNED
        )
        assertEquals("order_1", statusChanged.orderId)
        assertEquals(OrderStatus.ASSIGNED, statusChanged.status)

        val accountVerified = WebSocketEvent.AccountVerified
        assertEquals(null, accountVerified.orderId)

        val connectionChanged = WebSocketEvent.ConnectionStateChanged(isConnected = true)
        assertTrue(connectionChanged.isConnected)
        assertEquals(null, connectionChanged.orderId)
    }
}

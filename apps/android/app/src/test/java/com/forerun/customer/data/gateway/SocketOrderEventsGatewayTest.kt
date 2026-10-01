package com.forerun.customer.data.gateway

import app.cash.turbine.test
import com.forerun.customer.core.storage.FakeTokenStorage
import com.forerun.customer.core.websocket.SocketConnectionState
import com.forerun.customer.core.websocket.SocketManager
import com.forerun.customer.domain.model.OrderStatus
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import com.forerun.customer.core.websocket.WebSocketEvent as CoreWebSocketEvent
import com.forerun.customer.domain.model.WebSocketEvent as DomainWebSocketEvent

@OptIn(ExperimentalCoroutinesApi::class)
class SocketOrderEventsGatewayTest {

    private lateinit var tokenStorage: FakeTokenStorage
    private lateinit var socketManager: SocketManager
    private lateinit var gateway: SocketOrderEventsGateway

    @Before
    fun setUp() {
        tokenStorage = FakeTokenStorage(token = "test_token")
        socketManager = SocketManager(tokenStorage)
        gateway = SocketOrderEventsGateway(socketManager)
    }

    @Test
    fun `observes connectionState changes as ConnectionStateChanged events`() = runTest {
        gateway.observeEvents().test {
            // Initial state from StateFlow
            val initial = awaitItem()
            assertTrue(initial is DomainWebSocketEvent.ConnectionStateChanged)
            assertFalse((initial as DomainWebSocketEvent.ConnectionStateChanged).isConnected)

            // When socket transitions to CONNECTED
            socketManager.setConnectionStateForTesting(SocketConnectionState.CONNECTED)
            val connected = awaitItem()
            assertTrue(connected is DomainWebSocketEvent.ConnectionStateChanged)
            assertTrue((connected as DomainWebSocketEvent.ConnectionStateChanged).isConnected)

            // When socket transitions to DISCONNECTED
            socketManager.setConnectionStateForTesting(SocketConnectionState.DISCONNECTED)
            val disconnected = awaitItem()
            assertTrue(disconnected is DomainWebSocketEvent.ConnectionStateChanged)
            assertFalse((disconnected as DomainWebSocketEvent.ConnectionStateChanged).isConnected)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `maps StatusChanged to OrderStatusChanged with OrderStatus enum`() = runTest {
        gateway.observeEvents().test {
            // Initial connection state
            val initial = awaitItem()
            assertTrue(initial is DomainWebSocketEvent.ConnectionStateChanged)

            socketManager.emitEvent(
                CoreWebSocketEvent.StatusChanged(
                    orderId = "order_1",
                    orderNumber = "FW-100",
                    oldStatus = "DRAFT",
                    newStatus = "ASSIGNED"
                )
            )

            val event = awaitItem()
            assertTrue(event is DomainWebSocketEvent.OrderStatusChanged)
            val typed = event as DomainWebSocketEvent.OrderStatusChanged
            assertEquals("order_1", typed.orderId)
            assertEquals("FW-100", typed.orderNumber)
            assertEquals("DRAFT", typed.oldStatus)
            assertEquals(OrderStatus.ASSIGNED, typed.status)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `maps all core event variants accurately to domain`() = runTest {
        gateway.observeEvents().test {
            // Initial connection state
            val initial = awaitItem()
            assertTrue(initial is DomainWebSocketEvent.ConnectionStateChanged)

            socketManager.emitEvent(CoreWebSocketEvent.RunnerAssigned("order_1", "Runner Bob"))
            val runnerEvent = awaitItem() as DomainWebSocketEvent.RunnerAssigned
            assertEquals("order_1", runnerEvent.orderId)
            assertEquals("Runner Bob", runnerEvent.runnerName)

            socketManager.emitEvent(CoreWebSocketEvent.FeeUpdated("order_1", 1000, 1500, "extra distance"))
            val feeEvent = awaitItem() as DomainWebSocketEvent.FeeUpdated
            assertEquals("order_1", feeEvent.orderId)
            assertEquals(1000, feeEvent.oldFee)
            assertEquals(1500, feeEvent.newFee)
            assertEquals("extra distance", feeEvent.reason)

            socketManager.emitEvent(CoreWebSocketEvent.StorePurchased("order_1", "Store A"))
            val storePurchased = awaitItem() as DomainWebSocketEvent.StorePurchased
            assertEquals("order_1", storePurchased.orderId)
            assertEquals("Store A", storePurchased.storeName)

            socketManager.emitEvent(CoreWebSocketEvent.StoreSkipped("order_1", "Store B"))
            val storeSkipped = awaitItem() as DomainWebSocketEvent.StoreSkipped
            assertEquals("order_1", storeSkipped.orderId)
            assertEquals("Store B", storeSkipped.storeName)

            socketManager.emitEvent(CoreWebSocketEvent.OutForDelivery("order_1"))
            val outForDelivery = awaitItem() as DomainWebSocketEvent.OutForDelivery
            assertEquals("order_1", outForDelivery.orderId)

            socketManager.emitEvent(CoreWebSocketEvent.Delivered("order_1", "2026-10-01T12:00:00Z"))
            val delivered = awaitItem() as DomainWebSocketEvent.Delivered
            assertEquals("order_1", delivered.orderId)
            assertEquals("2026-10-01T12:00:00Z", delivered.deliveredAt)

            socketManager.emitEvent(CoreWebSocketEvent.Cancelled("order_1", "User cancelled", "CUSTOMER"))
            val cancelled = awaitItem() as DomainWebSocketEvent.Cancelled
            assertEquals("order_1", cancelled.orderId)
            assertEquals("User cancelled", cancelled.reason)
            assertEquals("CUSTOMER", cancelled.cancelledBy)

            socketManager.emitEvent(CoreWebSocketEvent.AccountVerified)
            val accountVerified = awaitItem()
            assertTrue(accountVerified is DomainWebSocketEvent.AccountVerified)

            socketManager.emitEvent(CoreWebSocketEvent.RawEvent("custom_event", "order_1", "raw_data"))
            val raw = awaitItem() as DomainWebSocketEvent.RawEvent
            assertEquals("custom_event", raw.eventName)
            assertEquals("order_1", raw.orderId)
            assertEquals("raw_data", raw.data)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `observeEvents with orderId filters by matching orderId`() = runTest {
        gateway.observeEvents("order_target").test {
            socketManager.emitEvent(CoreWebSocketEvent.OutForDelivery("order_other"))
            socketManager.emitEvent(CoreWebSocketEvent.OutForDelivery("order_target"))

            val event = awaitItem()
            assertEquals("order_target", event.orderId)

            cancelAndIgnoreRemainingEvents()
        }
    }
}

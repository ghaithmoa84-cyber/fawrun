package com.forerun.customer.core.websocket

import app.cash.turbine.test
import com.forerun.customer.core.storage.FakeTokenStorage
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SocketManagerTest {

    private lateinit var tokenStorage: FakeTokenStorage
    private lateinit var socketManager: SocketManager

    @Before
    fun setUp() {
        tokenStorage = FakeTokenStorage(token = "test-jwt-token")
        socketManager = SocketManager(tokenStorage)
    }

    @Test
    fun buildOptions_configures_reconnection_and_auth_correctly() {
        val options = socketManager.buildOptions("jwt_token_456")

        assertEquals(1, options.transports.size)
        assertEquals("websocket", options.transports[0])
        assertTrue(options.reconnection)
        assertEquals(1000L, options.reconnectionDelay)
        assertEquals(16000L, options.reconnectionDelayMax)
        assertNotNull(options.auth)
        assertEquals("jwt_token_456", options.auth["token"])
    }

    @Test
    fun connect_does_not_connect_when_in_background() {
        socketManager.onAppBackgrounded()
        assertFalse(socketManager.isForeground)

        socketManager.connect()
        assertEquals(SocketConnectionState.DISCONNECTED, socketManager.connectionState.value)
    }

    @Test
    fun connect_does_not_connect_when_token_is_missing() {
        tokenStorage.token = null
        socketManager.onAppForegrounded()

        assertTrue(socketManager.isForeground)
        assertEquals(SocketConnectionState.DISCONNECTED, socketManager.connectionState.value)
    }

    @Test
    fun onAppBackgrounded_sets_foreground_false() {
        socketManager.onAppForegrounded()
        assertTrue(socketManager.isForeground)

        socketManager.onAppBackgrounded()
        assertFalse(socketManager.isForeground)
        assertEquals(SocketConnectionState.DISCONNECTED, socketManager.connectionState.value)
    }

    @Test
    fun parseEvent_order_status_changed_parses_correctly() {
        val json = JSONObject().apply {
            put("orderId", "order_123")
            put("orderNumber", "FW-000001")
            put("oldStatus", "PENDING_REVIEW")
            put("newStatus", "ASSIGNED")
        }

        val event = socketManager.parseEvent("order:status_changed", json)
        assertTrue(event is WebSocketEvent.StatusChanged)
        val statusChanged = event as WebSocketEvent.StatusChanged
        assertEquals("order_123", statusChanged.orderId)
        assertEquals("FW-000001", statusChanged.orderNumber)
        assertEquals("PENDING_REVIEW", statusChanged.oldStatus)
        assertEquals("ASSIGNED", statusChanged.newStatus)
    }

    @Test
    fun parseEvent_order_runner_assigned_parses_correctly() {
        val json = JSONObject().apply {
            put("orderId", "order_123")
            put("runnerName", "الكابتن علي")
        }

        val event = socketManager.parseEvent("order:runner_assigned", json)
        assertTrue(event is WebSocketEvent.RunnerAssigned)
        val runnerAssigned = event as WebSocketEvent.RunnerAssigned
        assertEquals("order_123", runnerAssigned.orderId)
        assertEquals("الكابتن علي", runnerAssigned.runnerName)
    }

    @Test
    fun parseEvent_order_fee_updated_parses_correctly() {
        val json = JSONObject().apply {
            put("orderId", "order_123")
            put("oldFee", 5000)
            put("newFee", 7000)
            put("reason", "EXTRA_STORE")
        }

        val event = socketManager.parseEvent("order:fee_updated", json)
        assertTrue(event is WebSocketEvent.FeeUpdated)
        val feeUpdated = event as WebSocketEvent.FeeUpdated
        assertEquals("order_123", feeUpdated.orderId)
        assertEquals(5000, feeUpdated.oldFee)
        assertEquals(7000, feeUpdated.newFee)
        assertEquals("EXTRA_STORE", feeUpdated.reason)
    }

    @Test
    fun parseEvent_order_store_purchased_parses_correctly() {
        val json = JSONObject().apply {
            put("orderId", "order_123")
            put("storeName", "بقالية البركة")
        }

        val event = socketManager.parseEvent("order:store_purchased", json)
        assertTrue(event is WebSocketEvent.StorePurchased)
        val storePurchased = event as WebSocketEvent.StorePurchased
        assertEquals("order_123", storePurchased.orderId)
        assertEquals("بقالية البركة", storePurchased.storeName)
    }

    @Test
    fun parseEvent_order_store_skipped_parses_correctly() {
        val json = JSONObject().apply {
            put("orderId", "order_123")
            put("storeName", "مكتبة النور")
        }

        val event = socketManager.parseEvent("order:store_skipped", json)
        assertTrue(event is WebSocketEvent.StoreSkipped)
        val storeSkipped = event as WebSocketEvent.StoreSkipped
        assertEquals("order_123", storeSkipped.orderId)
        assertEquals("مكتبة النور", storeSkipped.storeName)
    }

    @Test
    fun parseEvent_order_out_for_delivery_parses_correctly() {
        val json = JSONObject().apply {
            put("orderId", "order_123")
        }

        val event = socketManager.parseEvent("order:out_for_delivery", json)
        assertTrue(event is WebSocketEvent.OutForDelivery)
        val outForDelivery = event as WebSocketEvent.OutForDelivery
        assertEquals("order_123", outForDelivery.orderId)
    }

    @Test
    fun parseEvent_order_delivered_parses_correctly() {
        val json = JSONObject().apply {
            put("orderId", "order_123")
            put("deliveredAt", "2026-09-28T14:30:00Z")
        }

        val event = socketManager.parseEvent("order:delivered", json)
        assertTrue(event is WebSocketEvent.Delivered)
        val delivered = event as WebSocketEvent.Delivered
        assertEquals("order_123", delivered.orderId)
        assertEquals("2026-09-28T14:30:00Z", delivered.deliveredAt)
    }

    @Test
    fun parseEvent_order_cancelled_parses_correctly() {
        val json = JSONObject().apply {
            put("orderId", "order_123")
            put("reason", "طلب العميل")
            put("cancelledBy", "CUSTOMER")
        }

        val event = socketManager.parseEvent("order:cancelled", json)
        assertTrue(event is WebSocketEvent.Cancelled)
        val cancelled = event as WebSocketEvent.Cancelled
        assertEquals("order_123", cancelled.orderId)
        assertEquals("طلب العميل", cancelled.reason)
        assertEquals("CUSTOMER", cancelled.cancelledBy)
    }

    @Test
    fun parseEvent_account_verified_parses_correctly() {
        val event = socketManager.parseEvent("account:verified", JSONObject())
        assertEquals(WebSocketEvent.AccountVerified, event)
    }

    @Test
    fun parseEvent_with_invalid_json_returns_null() {
        val event = socketManager.parseEvent("order:status_changed", null)
        assertNull(event)
    }

    @Test
    fun observeOrderEvents_filters_correctly_by_orderId() = runTest {
        socketManager.observeOrderEvents("target_order").test {
            val event1 = WebSocketEvent.StatusChanged("target_order", "FW-1", "PENDING", "ASSIGNED")
            val event2 = WebSocketEvent.StatusChanged("other_order", "FW-2", "PENDING", "ASSIGNED")
            val event3 = WebSocketEvent.Delivered("target_order", "2026-09-28T15:00:00Z")

            socketManager.emitEvent(event1)
            socketManager.emitEvent(event2)
            socketManager.emitEvent(event3)

            assertEquals(event1, awaitItem())
            assertEquals(event3, awaitItem())
            expectNoEvents()
        }
    }
}

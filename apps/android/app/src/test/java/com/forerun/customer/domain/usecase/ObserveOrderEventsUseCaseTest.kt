package com.forerun.customer.domain.usecase

import app.cash.turbine.test
import com.forerun.customer.data.FakeOrderEventsGateway
import com.forerun.customer.domain.model.OrderStatus
import com.forerun.customer.domain.model.WebSocketEvent
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ObserveOrderEventsUseCaseTest {

    private lateinit var fakeGateway: FakeOrderEventsGateway
    private lateinit var useCase: ObserveOrderEventsUseCase

    @Before
    fun setUp() {
        fakeGateway = FakeOrderEventsGateway()
        useCase = ObserveOrderEventsUseCase(fakeGateway)
    }

    @Test
    fun `receives OrderStatusChanged event via gateway`() = runTest {
        useCase().test {
            fakeGateway.emitEvent(
                WebSocketEvent.OrderStatusChanged(
                    orderId = "order_99",
                    status = OrderStatus.IN_PROGRESS,
                    orderNumber = "FW-99",
                    oldStatus = "ASSIGNED"
                )
            )

            val event = awaitItem()
            assertTrue(event is WebSocketEvent.OrderStatusChanged)
            val typed = event as WebSocketEvent.OrderStatusChanged
            assertEquals("order_99", typed.orderId)
            assertEquals(OrderStatus.IN_PROGRESS, typed.status)
            assertEquals("FW-99", typed.orderNumber)
            assertEquals("ASSIGNED", typed.oldStatus)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `receives AccountVerified event via gateway`() = runTest {
        useCase().test {
            fakeGateway.emitEvent(WebSocketEvent.AccountVerified)

            val event = awaitItem()
            assertTrue(event is WebSocketEvent.AccountVerified)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `receives ConnectionStateChanged event via gateway`() = runTest {
        useCase().test {
            fakeGateway.emitEvent(WebSocketEvent.ConnectionStateChanged(isConnected = true))

            val event = awaitItem()
            assertTrue(event is WebSocketEvent.ConnectionStateChanged)
            assertTrue((event as WebSocketEvent.ConnectionStateChanged).isConnected)

            fakeGateway.emitEvent(WebSocketEvent.ConnectionStateChanged(isConnected = false))
            val event2 = awaitItem()
            assertTrue(event2 is WebSocketEvent.ConnectionStateChanged)
            assertTrue(!(event2 as WebSocketEvent.ConnectionStateChanged).isConnected)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `invoking with orderId filters events for that order`() = runTest {
        useCase("order_target").test {
            fakeGateway.emitEvent(
                WebSocketEvent.OrderStatusChanged(
                    orderId = "order_other",
                    status = OrderStatus.DELIVERED
                )
            )
            fakeGateway.emitEvent(
                WebSocketEvent.OrderStatusChanged(
                    orderId = "order_target",
                    status = OrderStatus.DELIVERED
                )
            )

            val event = awaitItem()
            assertEquals("order_target", event.orderId)

            cancelAndIgnoreRemainingEvents()
        }
    }
}

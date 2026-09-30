package com.forerun.customer.core.notification

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationNavigationTest {

    @Test
    fun parse_payloadWithCamelCaseOrderId_extractsCorrectly() {
        val data = mapOf(
            "orderId" to "ord_abc123",
            "type" to "order:runner_assigned"
        )
        val payload = NotificationPayloadParser.parse(data)

        assertEquals("ord_abc123", payload.orderId)
        assertEquals("order:runner_assigned", payload.type)
        assertEquals("ord_abc123", payload.rawData["orderId"])
    }

    @Test
    fun parse_payloadWithSnakeCaseOrderId_extractsCorrectly() {
        val data = mapOf(
            "order_id" to "ord_xyz789",
            "type" to "order:delivered"
        )
        val payload = NotificationPayloadParser.parse(data)

        assertEquals("ord_xyz789", payload.orderId)
        assertEquals("order:delivered", payload.type)
        assertEquals("ord_xyz789", payload.rawData["order_id"])
    }

    @Test
    fun parse_payloadWithTitleAndBodyInNotification_prefersNotificationOverData() {
        val data = mapOf(
            "orderId" to "ord_100",
            "title" to "Data Title",
            "body" to "Data Body"
        )
        val payload = NotificationPayloadParser.parse(
            data = data,
            notificationTitle = "Notification Title",
            notificationBody = "Notification Body"
        )

        assertEquals("Notification Title", payload.title)
        assertEquals("Notification Body", payload.body)
        assertEquals("ord_100", payload.orderId)
    }

    @Test
    fun parse_payloadWithTitleAndBodyInDataOnly_extractsFromData() {
        val data = mapOf(
            "orderId" to "ord_200",
            "title" to "تم تعيين كابتن",
            "body" to "الكابتن أحمد في طريقه إلى المتجر",
            "type" to "order:runner_assigned"
        )
        val payload = NotificationPayloadParser.parse(data)

        assertEquals("تم تعيين كابتن", payload.title)
        assertEquals("الكابتن أحمد في طريقه إلى المتجر", payload.body)
        assertEquals("ord_200", payload.orderId)
    }

    @Test
    fun parse_emptyPayload_hasNoOrderId() {
        val payload = NotificationPayloadParser.parse(emptyMap())

        assertNull(payload.orderId)
        assertNull(payload.title)
        assertNull(payload.body)
        assertNull(payload.type)
    }

    @Test
    fun parse_blankOrderId_isTreatedAsNull() {
        val payload = NotificationPayloadParser.parse(mapOf("orderId" to "   "))

        assertNull(payload.orderId)
    }

    @Test
    fun extractOrderIdFromUrl_customSchemeForerun_extractsOrderId() {
        val url = "forerun://orders/ord_456"
        val orderId = NotificationPayloadParser.extractOrderIdFromUrl(url)

        assertEquals("ord_456", orderId)
    }

    @Test
    fun extractOrderIdFromUrl_httpsWebUrl_extractsOrderId() {
        val url = "https://forerun.app/orders/ord_789?source=fcm"
        val orderId = NotificationPayloadParser.extractOrderIdFromUrl(url)

        assertEquals("ord_789", orderId)
    }

    @Test
    fun extractOrderIdFromUrl_invalidOrEmpty_returnsNull() {
        assertNull(NotificationPayloadParser.extractOrderIdFromUrl(null))
        assertNull(NotificationPayloadParser.extractOrderIdFromUrl(""))
        assertNull(NotificationPayloadParser.extractOrderIdFromUrl("forerun://home"))
        assertNull(NotificationPayloadParser.extractOrderIdFromUrl("https://example.com/other/123"))
    }
}

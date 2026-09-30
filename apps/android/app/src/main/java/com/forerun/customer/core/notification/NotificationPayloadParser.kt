package com.forerun.customer.core.notification

import android.content.Context
import android.content.Intent
import android.net.Uri

data class NotificationPayload(
    val orderId: String? = null,
    val title: String? = null,
    val body: String? = null,
    val type: String? = null,
    val rawData: Map<String, String> = emptyMap()
) {
    fun toDeepLinkUri(): Uri? {
        return orderId?.let { Uri.parse("forerun://orders/$it") }
    }
}

object NotificationPayloadParser {

    const val EXTRA_ORDER_ID = "orderId"
    const val EXTRA_NOTIFICATION_TYPE = "notification_type"
    const val SCHEME_FORERUN = "forerun"
    const val HOST_ORDERS = "orders"

    fun extractOrderIdFromUrl(url: String?): String? {
        if (url.isNullOrBlank()) return null
        val trimmed = url.trim()
        val regex = Regex("^(?:forerun://orders/|https?://[^/]+/orders/)([^/?#]+)")
        val match = regex.find(trimmed)
        return match?.groupValues?.getOrNull(1)
    }

    fun parse(data: Map<String, String>, notificationTitle: String? = null, notificationBody: String? = null): NotificationPayload {
        val orderId = data["orderId"]
            ?: data["order_id"]
            ?: data["orderID"]
            ?: data["id"]

        val title = notificationTitle
            ?: data["title"]
            ?: data["notification_title"]

        val body = notificationBody
            ?: data["body"]
            ?: data["message"]
            ?: data["notification_body"]

        val type = data["type"]
            ?: data["event"]
            ?: data["notification_type"]

        return NotificationPayload(
            orderId = orderId?.takeIf { it.isNotBlank() },
            title = title?.takeIf { it.isNotBlank() },
            body = body?.takeIf { it.isNotBlank() },
            type = type?.takeIf { it.isNotBlank() },
            rawData = data
        )
    }

    fun extractOrderId(intent: Intent?): String? {
        if (intent == null) return null

        // 1. From extras
        val fromExtras = intent.getStringExtra(EXTRA_ORDER_ID)
            ?: intent.getStringExtra("order_id")
            ?: intent.extras?.getString(EXTRA_ORDER_ID)
            ?: intent.extras?.getString("order_id")

        if (!fromExtras.isNullOrBlank()) {
            return fromExtras
        }

        // 2. From URI string or URI object
        val fromUrl = extractOrderIdFromUrl(intent.dataString)
        if (!fromUrl.isNullOrBlank()) {
            return fromUrl
        }

        val dataUri = intent.data ?: return null
        val pathSegments = dataUri.pathSegments
        if (dataUri.scheme == SCHEME_FORERUN && dataUri.host == HOST_ORDERS) {
            return pathSegments.firstOrNull() ?: dataUri.lastPathSegment
        }
        if (pathSegments.contains(HOST_ORDERS)) {
            val index = pathSegments.indexOf(HOST_ORDERS)
            if (index + 1 < pathSegments.size) {
                return pathSegments[index + 1]
            }
        }

        return dataUri.lastPathSegment?.takeIf { it.isNotBlank() && it != HOST_ORDERS }
    }

    fun createIntent(context: Context, payload: NotificationPayload, targetActivityClass: Class<*>): Intent {
        val intent = Intent(context, targetActivityClass).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            payload.orderId?.let { putExtra(EXTRA_ORDER_ID, it) }
            payload.type?.let { putExtra(EXTRA_NOTIFICATION_TYPE, it) }
            payload.toDeepLinkUri()?.let { data = it }
        }
        return intent
    }
}

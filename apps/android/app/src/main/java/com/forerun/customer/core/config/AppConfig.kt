package com.forerun.customer.core.config

object AppConfig {
    /**
     * Official Admin WhatsApp number in international format without '+' for wa.me links.
     * Replaces temporary placeholders across the app (BUG-ANDROID-001).
     */
    const val ADMIN_WHATSAPP_NUMBER = "963951111111"
    const val ADMIN_WHATSAPP_DISPLAY = "+963 951 111 111"

    fun buildWhatsAppUrl(message: String): String {
        val encodedMessage = java.net.URLEncoder.encode(message, "UTF-8")
        return "https://wa.me/$ADMIN_WHATSAPP_NUMBER?text=$encodedMessage"
    }
}

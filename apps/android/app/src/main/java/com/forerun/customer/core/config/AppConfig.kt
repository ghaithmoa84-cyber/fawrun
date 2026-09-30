package com.forerun.customer.core.config

object AppConfig {
    /**
     * Official Admin WhatsApp number in international format without '+' for wa.me links.
     * Replaces temporary placeholders across the app (BUG-ANDROID-001).
     */
    const val ADMIN_WHATSAPP = "963981571936"
    const val ADMIN_WHATSAPP_NUMBER = "963981571936"
    const val ADMIN_WHATSAPP_DISPLAY = "+963 981 571 936"

    fun buildWhatsAppUrl(message: String): String {
        val encodedMessage = java.net.URLEncoder.encode(message, "UTF-8")
        return "https://wa.me/$ADMIN_WHATSAPP_NUMBER?text=$encodedMessage"
    }

    const val DEFAULT_COUNTRY_CODE = "963"

    /**
     * Builds a wa.me deep link for a runner phone number (BUG-ANDROID-005).
     * Strips a leading '+', an existing '963' country code, and a leading '0'
     * so that local ('0912...'), national ('912...') and international
     * ('+963912...' / '963912...') inputs all resolve to the same wa.me id.
     */
    fun buildRunnerWhatsAppUrl(phone: String): String {
        val cleaned = phone.trim()
            .removePrefix("+")
            .removePrefix(DEFAULT_COUNTRY_CODE)
            .removePrefix("0")
        return "https://wa.me/$DEFAULT_COUNTRY_CODE$cleaned"
    }
}

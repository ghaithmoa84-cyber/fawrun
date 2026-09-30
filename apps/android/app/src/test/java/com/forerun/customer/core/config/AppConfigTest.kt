package com.forerun.customer.core.config

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AppConfigTest {

    @Test
    fun buildRunnerWhatsAppUrl_localFormatWithLeadingZero_normalizesToCountryCode() {
        val url = AppConfig.buildRunnerWhatsAppUrl("0912345678")

        assertEquals("https://wa.me/963912345678", url)
    }

    @Test
    fun buildRunnerWhatsAppUrl_internationalWithPlus_normalizesToCountryCode() {
        val url = AppConfig.buildRunnerWhatsAppUrl("+963912345678")

        assertEquals("https://wa.me/963912345678", url)
    }

    @Test
    fun buildRunnerWhatsAppUrl_internationalWithoutPlus_normalizesToCountryCode() {
        val url = AppConfig.buildRunnerWhatsAppUrl("963912345678")

        assertEquals("https://wa.me/963912345678", url)
    }

    @Test
    fun buildRunnerWhatsAppUrl_nationalWithoutZero_keepsNationalPart() {
        val url = AppConfig.buildRunnerWhatsAppUrl("912345678")

        assertEquals("https://wa.me/963912345678", url)
    }

    @Test
    fun buildRunnerWhatsAppUrl_surroundingWhitespace_isTrimmed() {
        val url = AppConfig.buildRunnerWhatsAppUrl("  0912345678  ")

        assertEquals("https://wa.me/963912345678", url)
    }

    @Test
    fun buildRunnerWhatsAppUrl_alwaysUsesWaMeDomain() {
        val url = AppConfig.buildRunnerWhatsAppUrl("0912345678")

        assertTrue(url.startsWith("https://wa.me/"))
    }
}

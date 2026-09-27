package com.forerun.customer.core.error

import com.forerun.customer.core.network.ApiResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ErrorMapperTest {

    @Test
    fun `test map 401 to UiError Unauthorized`() {
        val apiError = ApiResponse.Error(
            statusCode = 401,
            error = "UNAUTHORIZED",
            message = "غير مصرح"
        )
        val uiError = apiError.toUiError()
        assertTrue(uiError is UiError.Unauthorized)
        assertEquals("غير مصرح", uiError.message)
    }

    @Test
    fun `test map 422 to UiError BusinessRule`() {
        val apiError = ApiResponse.Error(
            statusCode = 422,
            error = "BUSINESS_RULE_VIOLATION",
            message = "الرصيد غير كافي"
        )
        val uiError = apiError.toUiError()
        assertTrue(uiError is UiError.BusinessRule)
        assertEquals("الرصيد غير كافي", uiError.message)
    }

    @Test
    fun `test map network error to UiError Network`() {
        val apiError = ApiResponse.Error(
            statusCode = -1,
            error = "NETWORK_ERROR",
            message = "تعذر الاتصال بالخادم"
        )
        val uiError = apiError.toUiError()
        assertTrue(uiError is UiError.Network)
    }
}

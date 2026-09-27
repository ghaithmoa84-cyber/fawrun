package com.forerun.customer.core.error

import com.forerun.customer.core.network.ApiResponse

fun ApiResponse.Error.toUiError(): UiError {
    return when (statusCode) {
        -1 -> UiError.Network(message.ifBlank { "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت" })
        400 -> UiError.Validation(message)
        401 -> UiError.Unauthorized(message)
        403 -> UiError.Forbidden(message)
        404 -> UiError.NotFound(message)
        409 -> UiError.Conflict(message)
        422 -> UiError.BusinessRule(message)
        429 -> UiError.RateLimit(message)
        else -> when (error) {
            "NETWORK_ERROR" -> UiError.Network(message)
            "VALIDATION_ERROR" -> UiError.Validation(message)
            "BUSINESS_RULE_VIOLATION" -> UiError.BusinessRule(message)
            else -> UiError.Unknown(message.ifBlank { "حدث خطأ غير متوقع" })
        }
    }
}

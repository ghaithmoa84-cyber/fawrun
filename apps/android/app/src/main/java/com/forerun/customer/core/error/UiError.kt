package com.forerun.customer.core.error

sealed class UiError(open val message: String) {
    data class Validation(override val message: String) : UiError(message)
    data class Unauthorized(override val message: String) : UiError(message)
    data class Forbidden(override val message: String) : UiError(message)
    data class NotFound(override val message: String) : UiError(message)
    data class Conflict(override val message: String) : UiError(message)
    data class BusinessRule(override val message: String) : UiError(message)
    data class RateLimit(override val message: String) : UiError(message)
    data class Network(
        override val message: String = "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت"
    ) : UiError(message)
    data class Unknown(
        override val message: String = "حدث خطأ غير متوقع"
    ) : UiError(message)
}

package com.forerun.customer.domain.model

sealed interface CancelOrderError {
    data object NotAllowed : CancelOrderError
    data object StateChanged : CancelOrderError
    data object NotFound : CancelOrderError
    data object Network : CancelOrderError
    data object Unknown : CancelOrderError

    companion object {
        fun from(throwable: Throwable): CancelOrderError {
            val api = throwable as? ApiException ?: return Unknown
            return when {
                api.errorCode == "BUSINESS_RULE_VIOLATION" || api.statusCode == 422 -> NotAllowed
                api.errorCode == "CONFLICT" || api.statusCode == 409 -> StateChanged
                api.errorCode == "NOT_FOUND" || api.statusCode == 404 -> NotFound
                api.errorCode == "NETWORK_ERROR" -> Network
                else -> Unknown
            }
        }
    }
}
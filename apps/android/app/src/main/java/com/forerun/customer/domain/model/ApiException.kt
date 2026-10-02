package com.forerun.customer.domain.model

/**
 * Carries the transport-level failure of an API call as stable codes only.
 *
 * The server `message` is deliberately excluded: it may contain internal
 * identifiers (state machine names, SQL fragments) and must never reach the UI.
 */
class ApiException(
    val statusCode: Int,
    val errorCode: String
) : Exception("HTTP $statusCode $errorCode")
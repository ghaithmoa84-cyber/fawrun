package com.forerun.customer.core.network

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ApiErrorResponse(
    @Json(name = "statusCode") val statusCode: Int? = null,
    @Json(name = "error") val error: String? = null,
    @Json(name = "message") val message: String? = null
)

package com.forerun.customer.data.remote.dto.auth

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class RegisterResponse(
    @Json(name = "statusCode") val statusCode: Int? = null,
    @Json(name = "message") val message: String? = null,
    @Json(name = "userId") val userId: String? = null
)

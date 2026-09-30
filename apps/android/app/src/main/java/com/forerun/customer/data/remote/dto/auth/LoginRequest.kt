package com.forerun.customer.data.remote.dto.auth

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(
    @Json(name = "whatsapp") val whatsapp: String,
    @Json(name = "password") val password: String
)

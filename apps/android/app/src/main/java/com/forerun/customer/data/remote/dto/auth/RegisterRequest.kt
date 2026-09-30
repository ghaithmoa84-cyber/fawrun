package com.forerun.customer.data.remote.dto.auth

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class RegisterRequest(
    @Json(name = "name") val name: String,
    @Json(name = "whatsapp") val whatsapp: String,
    @Json(name = "altPhone") val altPhone: String? = null,
    @Json(name = "password") val password: String,
    @Json(name = "address") val address: AddressDto
)

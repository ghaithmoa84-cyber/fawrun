package com.forerun.customer.data.remote.dto.customer

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    @Json(name = "name") val name: String,
    @Json(name = "altPhone") val altPhone: String? = null
)

@JsonClass(generateAdapter = true)
data class ChangePasswordRequest(
    @Json(name = "password") val password: String
)

typealias UpdateCustomerProfileRequest = UpdateProfileRequest

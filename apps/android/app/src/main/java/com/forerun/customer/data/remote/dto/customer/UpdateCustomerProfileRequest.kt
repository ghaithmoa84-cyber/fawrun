package com.forerun.customer.data.remote.dto.customer

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class UpdateCustomerProfileRequest(
    @Json(name = "name") val name: String? = null,
    @Json(name = "altPhone") val altPhone: String? = null,
    @Json(name = "password") val password: String? = null
)

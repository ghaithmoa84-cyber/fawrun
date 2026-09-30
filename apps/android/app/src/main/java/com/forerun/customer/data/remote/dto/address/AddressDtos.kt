package com.forerun.customer.data.remote.dto.address

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class CustomerAddressDto(
    @Json(name = "lat") val lat: Double,
    @Json(name = "lng") val lng: Double,
    @Json(name = "description") val description: String
)

@JsonClass(generateAdapter = true)
data class UpdateCustomerAddressRequest(
    @Json(name = "lat") val lat: Double,
    @Json(name = "lng") val lng: Double,
    @Json(name = "description") val description: String
)

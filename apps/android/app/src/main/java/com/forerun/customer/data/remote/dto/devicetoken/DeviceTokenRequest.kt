package com.forerun.customer.data.remote.dto.devicetoken

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class DeviceTokenRequest(
    @Json(name = "token") val token: String,
    @Json(name = "platform") val platform: String = "android"
)

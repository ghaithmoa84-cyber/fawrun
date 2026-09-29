package com.forerun.customer.data.remote.api

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.dto.devicetoken.DeviceTokenRequest
import retrofit2.http.Body
import retrofit2.http.HTTP
import retrofit2.http.POST

interface DeviceTokenApi {
    @POST("customer/me/device-token")
    suspend fun registerDeviceToken(@Body body: DeviceTokenRequest): ApiResponse<Unit>

    @HTTP(method = "DELETE", path = "customer/me/device-token", hasBody = true)
    suspend fun unregisterDeviceToken(@Body body: DeviceTokenRequest): ApiResponse<Unit>
}

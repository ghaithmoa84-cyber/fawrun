package com.forerun.customer.domain.repository

import com.forerun.customer.core.network.ApiResponse

interface DeviceTokenRepository {
    suspend fun registerDeviceToken(token: String): ApiResponse<Unit>
    suspend fun unregisterDeviceToken(token: String): ApiResponse<Unit>
    suspend fun registerCurrentToken(): ApiResponse<Unit>
    suspend fun unregisterCurrentToken(): ApiResponse<Unit>
}

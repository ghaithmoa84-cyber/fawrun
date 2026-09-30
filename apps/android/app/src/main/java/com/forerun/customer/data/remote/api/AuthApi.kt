package com.forerun.customer.data.remote.api

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.dto.auth.LoginRequest
import com.forerun.customer.data.remote.dto.auth.LoginResponse
import com.forerun.customer.data.remote.dto.auth.LogoutRequest
import com.forerun.customer.data.remote.dto.auth.RefreshRequest
import com.forerun.customer.data.remote.dto.auth.RefreshResponse
import com.forerun.customer.data.remote.dto.auth.RegisterRequest
import com.forerun.customer.data.remote.dto.auth.RegisterResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): ApiResponse<LoginResponse>

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): ApiResponse<RegisterResponse>

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): ApiResponse<RefreshResponse>

    @POST("auth/logout")
    suspend fun logout(@Body body: LogoutRequest): ApiResponse<Unit>
}

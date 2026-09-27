package com.forerun.customer.data.remote.api

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.dto.customer.CustomerProfileDto
import retrofit2.http.GET

interface CustomerApi {
    @GET("customer/me")
    suspend fun me(): ApiResponse<CustomerProfileDto>
}

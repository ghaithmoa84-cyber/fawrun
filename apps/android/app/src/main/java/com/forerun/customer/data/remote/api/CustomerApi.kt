package com.forerun.customer.data.remote.api

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.dto.address.CustomerAddressDto
import com.forerun.customer.data.remote.dto.address.UpdateCustomerAddressRequest
import com.forerun.customer.data.remote.dto.customer.CustomerProfileDto
import com.forerun.customer.data.remote.dto.order.AvailableRunnerDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT

interface CustomerApi {
    @GET("customer/me")
    suspend fun me(): ApiResponse<CustomerProfileDto>

    @GET("customer/me/address")
    suspend fun getAddress(): ApiResponse<CustomerAddressDto>

    @PUT("customer/me/address")
    suspend fun updateAddress(@Body body: UpdateCustomerAddressRequest): ApiResponse<CustomerAddressDto>

    @GET("customer/runners")
    suspend fun getAvailableRunners(): ApiResponse<List<AvailableRunnerDto>>
}

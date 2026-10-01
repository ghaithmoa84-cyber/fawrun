package com.forerun.customer.data.remote.api

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.dto.address.CustomerAddressDto
import com.forerun.customer.data.remote.dto.address.UpdateCustomerAddressRequest
import com.forerun.customer.data.remote.dto.customer.ChangePasswordRequest
import com.forerun.customer.data.remote.dto.customer.CustomerProfileDto
import com.forerun.customer.data.remote.dto.customer.UpdateProfileRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT

interface CustomerApi {
    @GET("customer/me")
    suspend fun me(): ApiResponse<CustomerProfileDto>

    @PUT("customer/me")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): ApiResponse<CustomerProfileDto>

    @PUT("customer/me")
    suspend fun changePassword(@Body body: ChangePasswordRequest): ApiResponse<CustomerProfileDto>

    @GET("customer/me/address")
    suspend fun getAddress(): ApiResponse<CustomerAddressDto>

    @PUT("customer/me/address")
    suspend fun updateAddress(@Body body: UpdateCustomerAddressRequest): ApiResponse<CustomerAddressDto>
}

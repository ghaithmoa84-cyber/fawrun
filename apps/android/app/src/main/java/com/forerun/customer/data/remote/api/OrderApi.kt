package com.forerun.customer.data.remote.api

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.dto.order.CreateOrderRequestDto
import com.forerun.customer.data.remote.dto.order.CreateOrderResponseDto
import com.forerun.customer.data.remote.dto.order.PaginatedOrdersDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface OrderApi {
    @GET("customer/orders")
    suspend fun getCustomerOrders(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null
    ): ApiResponse<PaginatedOrdersDto>

    @POST("customer/orders")
    suspend fun createOrder(
        @Body request: CreateOrderRequestDto
    ): ApiResponse<CreateOrderResponseDto>
}

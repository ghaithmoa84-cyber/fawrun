package com.forerun.customer.core.network

sealed interface ApiResponse<out T> {
    data class Success<out T>(val data: T) : ApiResponse<T>
    data class Error(
        val statusCode: Int,
        val error: String,
        val message: String
    ) : ApiResponse<Nothing>
}

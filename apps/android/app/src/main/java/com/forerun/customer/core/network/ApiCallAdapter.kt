package com.forerun.customer.core.network

import com.squareup.moshi.Moshi
import retrofit2.Call
import retrofit2.CallAdapter
import java.lang.reflect.Type

class ApiCallAdapter<T>(
    private val responseType: Type,
    private val moshi: Moshi
) : CallAdapter<T, Call<ApiResponse<T>>> {

    override fun responseType(): Type = responseType

    override fun adapt(call: Call<T>): Call<ApiResponse<T>> {
        return ApiCall(call, moshi)
    }
}

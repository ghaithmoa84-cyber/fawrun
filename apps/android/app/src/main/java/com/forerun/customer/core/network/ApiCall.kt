package com.forerun.customer.core.network

import com.squareup.moshi.Moshi
import okhttp3.Request
import okio.Timeout
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.IOException

internal class ApiCall<T>(
    private val delegate: Call<T>,
    private val moshi: Moshi
) : Call<ApiResponse<T>> {

    override fun enqueue(callback: Callback<ApiResponse<T>>) {
        delegate.enqueue(object : Callback<T> {
            override fun onResponse(call: Call<T>, response: Response<T>) {
                val apiResponse = if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null) {
                        ApiResponse.Success(body)
                    } else if (response.code() == 204 || delegate.request().method == "HEAD") {
                        @Suppress("UNCHECKED_CAST")
                        ApiResponse.Success(Unit as T)
                    } else {
                        @Suppress("UNCHECKED_CAST")
                        ApiResponse.Success(body as T)
                    }
                } else {
                    parseErrorResponse(response)
                }
                callback.onResponse(this@ApiCall, Response.success(apiResponse))
            }

            override fun onFailure(call: Call<T>, t: Throwable) {
                val apiResponse = when (t) {
                    is IOException -> ApiResponse.Error(
                        statusCode = -1,
                        error = "NETWORK_ERROR",
                        message = "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت"
                    )
                    else -> ApiResponse.Error(
                        statusCode = -1,
                        error = "UNKNOWN",
                        message = t.localizedMessage ?: "حدث خطأ غير متوقع"
                    )
                }
                callback.onResponse(this@ApiCall, Response.success(apiResponse))
            }
        })
    }

    override fun isExecuted(): Boolean = delegate.isExecuted

    override fun execute(): Response<ApiResponse<T>> {
        return try {
            val response = delegate.execute()
            val apiResponse = if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    ApiResponse.Success(body)
                } else if (response.code() == 204 || delegate.request().method == "HEAD") {
                    @Suppress("UNCHECKED_CAST")
                    ApiResponse.Success(Unit as T)
                } else {
                    @Suppress("UNCHECKED_CAST")
                    ApiResponse.Success(body as T)
                }
            } else {
                parseErrorResponse(response)
            }
            Response.success(apiResponse)
        } catch (t: Throwable) {
            val apiResponse = when (t) {
                is IOException -> ApiResponse.Error(
                    statusCode = -1,
                    error = "NETWORK_ERROR",
                    message = "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت"
                )
                else -> ApiResponse.Error(
                    statusCode = -1,
                    error = "UNKNOWN",
                    message = t.localizedMessage ?: "حدث خطأ غير متوقع"
                )
            }
            Response.success(apiResponse)
        }
    }

    override fun cancel() = delegate.cancel()

    override fun isCanceled(): Boolean = delegate.isCanceled

    override fun clone(): Call<ApiResponse<T>> = ApiCall(delegate.clone(), moshi)

    override fun request(): Request = delegate.request()

    override fun timeout(): Timeout = delegate.timeout()

    private fun <R> parseErrorResponse(response: Response<R>): ApiResponse.Error {
        val errorBodyString = response.errorBody()?.string()
        if (!errorBodyString.isNullOrBlank()) {
            try {
                val adapter = moshi.adapter(ApiErrorResponse::class.java)
                val errorResponse = adapter.fromJson(errorBodyString)
                if (errorResponse != null) {
                    return ApiResponse.Error(
                        statusCode = errorResponse.statusCode ?: response.code(),
                        error = errorResponse.error ?: "UNKNOWN",
                        message = errorResponse.message ?: "خطأ غير متوقع"
                    )
                }
            } catch (_: Exception) {
                // fall through to default error
            }
        }
        return ApiResponse.Error(
            statusCode = response.code(),
            error = "UNKNOWN",
            message = "خطأ غير متوقع"
        )
    }
}

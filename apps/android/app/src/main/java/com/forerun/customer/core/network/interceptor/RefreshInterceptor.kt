package com.forerun.customer.core.network.interceptor

import com.forerun.customer.core.storage.TokenStorage
import com.forerun.customer.data.remote.token.TokenRefreshManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RefreshInterceptor @Inject constructor(
    private val tokenStorage: TokenStorage,
    private val tokenRefreshManager: TokenRefreshManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)

        if (response.code == 401) {
            val isRetry = request.header(HEADER_RETRY_AFTER_REFRESH) == "true"
            val isAuthEndpoint = request.url.encodedPath.contains("/auth/")

            if (!isRetry && !isAuthEndpoint) {
                response.close()

                val refreshed = kotlinx.coroutines.runBlocking {
                    tokenRefreshManager.refreshTokenIfNeeded(force = true)
                }

                if (refreshed) {
                    val newAccessToken = tokenStorage.getAccessToken()
                    if (newAccessToken != null) {
                        val retryRequest = request.newBuilder()
                            .header("Authorization", "Bearer $newAccessToken")
                            .header(HEADER_RETRY_AFTER_REFRESH, "true")
                            .build()
                        return chain.proceed(retryRequest)
                    }
                }
                tokenRefreshManager.handleSessionExpired()
            } else if (isRetry) {
                tokenRefreshManager.handleSessionExpired()
            }

        }

        return response
    }

    companion object {
        const val HEADER_RETRY_AFTER_REFRESH = "X-Retry-After-Refresh"
    }
}

package com.forerun.customer.core.network.interceptor

import com.forerun.customer.core.auth.TokenRefreshManager
import com.forerun.customer.core.storage.TokenStorage
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RefreshInterceptor @Inject constructor(
    private val tokenStorage: TokenStorage,
    private val tokenRefreshManager: TokenRefreshManager
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        val request = response.request

        // Do not attempt to refresh for authentication endpoints
        if (request.url.encodedPath.contains("/auth/")) {
            return null
        }

        // Avoid infinite loops if this request is already a retry or retried multiple times
        if (request.header(HEADER_RETRY_AFTER_REFRESH) == "true" || responseCount(response) >= 2) {
            tokenRefreshManager.handleSessionExpired()
            return null
        }

        // If another concurrent request has already refreshed the token, retry with the updated token
        val currentToken = tokenStorage.getAccessToken()
        if (!currentToken.isNullOrBlank() && request.header("Authorization") != "Bearer $currentToken") {
            return request.newBuilder()
                .header("Authorization", "Bearer $currentToken")
                .header(HEADER_RETRY_AFTER_REFRESH, "true")
                .build()
        }

        val refreshed = try {
            runBlocking {
                tokenRefreshManager.refreshTokenIfNeeded(force = true)
            }
        } catch (_: Exception) {
            false
        }

        if (refreshed) {
            val newAccessToken = tokenStorage.getAccessToken()
            if (!newAccessToken.isNullOrBlank()) {
                return request.newBuilder()
                    .header("Authorization", "Bearer $newAccessToken")
                    .header(HEADER_RETRY_AFTER_REFRESH, "true")
                    .build()
            }
        }

        tokenRefreshManager.handleSessionExpired()
        return null
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }

    companion object {
        const val HEADER_RETRY_AFTER_REFRESH = "X-Retry-After-Refresh"
    }
}

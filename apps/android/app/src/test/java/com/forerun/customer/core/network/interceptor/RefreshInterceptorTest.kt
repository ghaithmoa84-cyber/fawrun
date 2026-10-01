package com.forerun.customer.core.network.interceptor

import com.forerun.customer.core.auth.TokenRefreshManager
import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.core.storage.FakeTokenStorage
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.LoginRequest
import com.forerun.customer.data.remote.dto.auth.LoginResponse
import com.forerun.customer.data.remote.dto.auth.LogoutRequest
import com.forerun.customer.data.remote.dto.auth.RefreshRequest
import com.forerun.customer.data.remote.dto.auth.RefreshResponse
import com.forerun.customer.data.remote.dto.auth.RegisterRequest
import com.forerun.customer.data.remote.dto.auth.RegisterResponse
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import javax.inject.Provider

class RefreshInterceptorTest {

    private class FakeAuthApi : AuthApi {
        var refreshResult: ApiResponse<RefreshResponse> = ApiResponse.Success(
            RefreshResponse(accessToken = "new_token_123", refreshToken = "new_refresh_456")
        )
        var refreshCallCount = 0

        override suspend fun login(body: LoginRequest): ApiResponse<LoginResponse> = throw NotImplementedError()
        override suspend fun register(body: RegisterRequest): ApiResponse<RegisterResponse> = throw NotImplementedError()
        override suspend fun logout(body: LogoutRequest): ApiResponse<Unit> = ApiResponse.Success(Unit)
        override suspend fun refresh(body: RefreshRequest): ApiResponse<RefreshResponse> {
            refreshCallCount++
            return refreshResult
        }
    }

    private fun createResponse(
        url: String = "https://fawrun-api-production.up.railway.app/api/v1/orders",
        code: Int = 401,
        headers: Map<String, String> = emptyMap(),
        priorResponse: Response? = null
    ): Response {
        val requestBuilder = Request.Builder().url(url)
        headers.forEach { (k, v) -> requestBuilder.header(k, v) }
        val request = requestBuilder.build()

        val responseBuilder = Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_1_1)
            .code(code)
            .message("Unauthorized")
        if (priorResponse != null) {
            responseBuilder.priorResponse(priorResponse)
        }
        return responseBuilder.build()
    }

    @Test
    fun authenticate_returns_null_for_auth_endpoints() {
        val storage = FakeTokenStorage()
        val authApi = FakeAuthApi()
        val manager = TokenRefreshManager(storage, Provider { authApi })
        val authenticator = RefreshInterceptor(storage, manager)

        val response = createResponse(url = "https://fawrun-api-production.up.railway.app/api/v1/auth/login")
        val result = authenticator.authenticate(null, response)

        assertNull(result)
        assertEquals(0, authApi.refreshCallCount)
    }

    @Test
    fun authenticate_returns_null_and_clears_storage_if_already_retried() {
        val storage = FakeTokenStorage(token = "expired_token", refresh = "refresh_token")
        val authApi = FakeAuthApi()
        val manager = TokenRefreshManager(storage, Provider { authApi })
        val authenticator = RefreshInterceptor(storage, manager)

        val response = createResponse(
            headers = mapOf(RefreshInterceptor.HEADER_RETRY_AFTER_REFRESH to "true")
        )
        val result = authenticator.authenticate(null, response)

        assertNull(result)
        assertNull(storage.getAccessToken())
        assertNull(storage.getRefreshToken())
        assertEquals(0, authApi.refreshCallCount)
    }

    @Test
    fun authenticate_returns_null_and_clears_storage_if_priorResponse_exists() {
        val storage = FakeTokenStorage(token = "expired_token", refresh = "refresh_token")
        val authApi = FakeAuthApi()
        val manager = TokenRefreshManager(storage, Provider { authApi })
        val authenticator = RefreshInterceptor(storage, manager)

        val prior = createResponse()
        val response = createResponse(priorResponse = prior)
        val result = authenticator.authenticate(null, response)

        assertNull(result)
        assertNull(storage.getAccessToken())
        assertNull(storage.getRefreshToken())
        assertEquals(0, authApi.refreshCallCount)
    }

    @Test
    fun authenticate_refreshes_token_and_returns_retry_request() {
        val storage = FakeTokenStorage(token = "expired_token", refresh = "valid_refresh")
        val authApi = FakeAuthApi()
        val manager = TokenRefreshManager(storage, Provider { authApi })
        val authenticator = RefreshInterceptor(storage, manager)

        val response = createResponse(
            headers = mapOf("Authorization" to "Bearer expired_token")
        )
        val result = authenticator.authenticate(null, response)

        assertNotNull(result)
        assertEquals("Bearer new_token_123", result?.header("Authorization"))
        assertEquals("true", result?.header(RefreshInterceptor.HEADER_RETRY_AFTER_REFRESH))
        assertEquals(1, authApi.refreshCallCount)
        assertEquals("new_token_123", storage.getAccessToken())
    }

    @Test
    fun authenticate_handles_refresh_failure_by_clearing_session_and_returning_null() {
        val storage = FakeTokenStorage(token = "expired_token", refresh = "invalid_refresh")
        val authApi = FakeAuthApi().apply {
            refreshResult = ApiResponse.Error(401, "UNAUTHORIZED", "Invalid token")
        }
        val manager = TokenRefreshManager(storage, Provider { authApi })
        val authenticator = RefreshInterceptor(storage, manager)

        val response = createResponse(
            headers = mapOf("Authorization" to "Bearer expired_token")
        )
        val result = authenticator.authenticate(null, response)

        assertNull(result)
        assertNull(storage.getAccessToken())
        assertNull(storage.getRefreshToken())
        assertEquals(1, authApi.refreshCallCount)
    }

    @Test
    fun authenticate_reuses_already_refreshed_token_without_api_call() {
        val storage = FakeTokenStorage(token = "already_refreshed_token", refresh = "refresh_token")
        val authApi = FakeAuthApi()
        val manager = TokenRefreshManager(storage, Provider { authApi })
        val authenticator = RefreshInterceptor(storage, manager)

        // Request used old_token, but storage already has already_refreshed_token
        val response = createResponse(
            headers = mapOf("Authorization" to "Bearer old_token")
        )
        val result = authenticator.authenticate(null, response)

        assertNotNull(result)
        assertEquals("Bearer already_refreshed_token", result?.header("Authorization"))
        assertEquals("true", result?.header(RefreshInterceptor.HEADER_RETRY_AFTER_REFRESH))
        assertEquals(0, authApi.refreshCallCount) // No API call needed!
    }
}

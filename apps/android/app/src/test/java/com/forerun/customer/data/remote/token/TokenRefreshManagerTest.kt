package com.forerun.customer.data.remote.token

import app.cash.turbine.test
import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.core.storage.FakeTokenStorage
import com.forerun.customer.core.storage.TokenStorage
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.LoginRequest
import com.forerun.customer.data.remote.dto.auth.LoginResponse
import com.forerun.customer.data.remote.dto.auth.LogoutRequest
import com.forerun.customer.data.remote.dto.auth.RefreshRequest
import com.forerun.customer.data.remote.dto.auth.RefreshResponse
import com.forerun.customer.data.remote.dto.auth.RegisterRequest
import com.forerun.customer.data.remote.dto.auth.RegisterResponse
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import javax.inject.Provider

class TokenRefreshManagerTest {

    private class FakeAuthApi : AuthApi {
        var refreshCallCount = 0
        var refreshResult: ApiResponse<RefreshResponse> = ApiResponse.Success(
            RefreshResponse(accessToken = "new_access_token", refreshToken = "new_refresh_token")
        )

        override suspend fun login(body: LoginRequest): ApiResponse<LoginResponse> = throw NotImplementedError()
        override suspend fun register(body: RegisterRequest): ApiResponse<RegisterResponse> = throw NotImplementedError()
        override suspend fun logout(body: LogoutRequest): ApiResponse<Unit> = ApiResponse.Success(Unit)
        override suspend fun refresh(body: RefreshRequest): ApiResponse<RefreshResponse> {
            refreshCallCount++
            return refreshResult
        }
    }

    @Test
    fun refreshTokenIfNeeded_with_force_true_refreshes_even_if_token_not_near_expiry() = runTest {
        val storage = FakeTokenStorage(
            token = "old_access",
            refresh = "valid_refresh",
            expiry = System.currentTimeMillis() + 30 * 60 * 1000L
        )
        val api = FakeAuthApi()
        val manager = TokenRefreshManager(storage, Provider { api })

        // Calling with force = true should bypass shouldRefresh() and call API
        val success = manager.refreshTokenIfNeeded(force = true)

        assertTrue(success)
        assertEquals(1, api.refreshCallCount)
        assertEquals("new_access_token", storage.getAccessToken())
        assertEquals("new_refresh_token", storage.getRefreshToken())
    }

    @Test
    fun refreshTokenIfNeeded_with_force_false_skips_refresh_if_token_valid() = runTest {
        val storage = FakeTokenStorage(
            token = "old_access",
            refresh = "valid_refresh",
            expiry = System.currentTimeMillis() + 30 * 60 * 1000L
        )
        val api = FakeAuthApi()
        val manager = TokenRefreshManager(storage, Provider { api })

        val success = manager.refreshTokenIfNeeded(force = false)

        assertTrue(success)
        assertEquals(0, api.refreshCallCount)
        assertEquals("old_access", storage.getAccessToken())
    }

    @Test
    fun refreshTokenIfNeeded_when_token_near_expiry_triggers_refresh() = runTest {
        val storage = FakeTokenStorage(
            token = "old_access",
            refresh = "valid_refresh",
            expiry = System.currentTimeMillis() + 5 * 60 * 1000L
        )
        val api = FakeAuthApi()
        val manager = TokenRefreshManager(storage, Provider { api })

        val success = manager.refreshTokenIfNeeded(force = false)

        assertTrue(success)
        assertEquals(1, api.refreshCallCount)
        assertEquals("new_access_token", storage.getAccessToken())
    }

    @Test
    fun refreshTokenIfNeeded_handles_api_failure_and_expires_session() = runTest {
        val storage = FakeTokenStorage(
            token = "old_access",
            refresh = "valid_refresh",
            expiry = System.currentTimeMillis() + 30 * 60 * 1000L
        )
        val api = FakeAuthApi().apply {
            refreshResult = ApiResponse.Error(401, "UNAUTHORIZED", "Refresh token expired")
        }
        val manager = TokenRefreshManager(storage, Provider { api })

        manager.sessionExpiredEvent.test {
            val success = manager.refreshTokenIfNeeded(force = true)
            assertFalse(success)
            assertEquals(1, api.refreshCallCount)
            assertEquals(null, storage.getAccessToken())
            assertEquals(null, storage.getRefreshToken())
            awaitItem() // Verify sessionExpiredEvent emitted
        }
    }
}

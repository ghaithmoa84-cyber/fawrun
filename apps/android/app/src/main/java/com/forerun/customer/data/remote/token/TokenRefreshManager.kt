package com.forerun.customer.data.remote.token

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.core.storage.TokenStorage
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.RefreshRequest
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

@Singleton
class TokenRefreshManager @Inject constructor(
    private val tokenStorage: TokenStorage,
    private val authApiProvider: Provider<AuthApi>
) {
    private val refreshMutex = Mutex()

    private val _sessionExpiredEvent = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpiredEvent: SharedFlow<Unit> = _sessionExpiredEvent.asSharedFlow()

    fun shouldRefresh(): Boolean {
        val expiry = tokenStorage.getTokenExpiry()
        if (expiry == 0L) return false
        val now = System.currentTimeMillis()
        val tenMinutesMillis = 10 * 60 * 1000L
        return (expiry - now) < tenMinutesMillis
    }

    suspend fun refreshTokenIfNeeded(): Boolean {
        if (!shouldRefresh()) {
            return true
        }

        return refreshMutex.withLock {
            // Re-check inside lock
            if (!shouldRefresh()) {
                return@withLock true
            }

            val refreshToken = tokenStorage.getRefreshToken()
            if (refreshToken.isNullOrBlank()) {
                handleSessionExpired()
                return@withLock false
            }

            return@withLock try {
                val authApi = authApiProvider.get()
                when (val response = authApi.refresh(RefreshRequest(refreshToken))) {
                    is ApiResponse.Success -> {
                        tokenStorage.setAccessToken(response.data.accessToken)
                        tokenStorage.setRefreshToken(response.data.refreshToken)
                        tokenStorage.setTokenExpiry(System.currentTimeMillis() + 2 * 3600 * 1000L)
                        true
                    }
                    is ApiResponse.Error -> {
                        handleSessionExpired()
                        false
                    }
                }
            } catch (_: Exception) {
                handleSessionExpired()
                false
            }
        }
    }

    fun handleSessionExpired() {
        tokenStorage.clearAll()
        _sessionExpiredEvent.tryEmit(Unit)
    }
}


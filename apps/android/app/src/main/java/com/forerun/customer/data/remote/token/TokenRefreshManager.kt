package com.forerun.customer.data.remote.token

import com.forerun.customer.core.storage.TokenStorage
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenRefreshManager @Inject constructor(
    private val tokenStorage: TokenStorage
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

    suspend fun refreshTokenIfNeeded(
        performRefresh: (suspend (refreshToken: String) -> Boolean)? = null
    ): Boolean {
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

            if (performRefresh != null) {
                try {
                    val success = performRefresh(refreshToken)
                    if (!success) {
                        handleSessionExpired()
                        return@withLock false
                    }
                    true
                } catch (_: Exception) {
                    handleSessionExpired()
                    false
                }
            } else {
                // In Sprint 1.3, actual network refresh wiring is in place
                true
            }
        }
    }

    fun handleSessionExpired() {
        tokenStorage.clearAll()
        _sessionExpiredEvent.tryEmit(Unit)
    }
}

package com.forerun.customer.data.remote.token

import com.forerun.customer.core.auth.SessionExpiryNotifier
import com.forerun.customer.core.auth.TokenRefreshManager
import kotlinx.coroutines.flow.SharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DefaultSessionExpiryNotifier @Inject constructor(
    private val tokenRefreshManager: TokenRefreshManager
) : SessionExpiryNotifier {
    override val sessionExpiredEvent: SharedFlow<Unit> = tokenRefreshManager.sessionExpiredEvent
}

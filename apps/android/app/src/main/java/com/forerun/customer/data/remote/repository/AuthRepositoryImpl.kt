package com.forerun.customer.data.remote.repository

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.core.storage.OnboardingPrefs
import com.forerun.customer.core.storage.TokenStorage
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.AddressDto
import com.forerun.customer.data.remote.dto.auth.LoginRequest
import com.forerun.customer.data.remote.dto.auth.LogoutRequest
import com.forerun.customer.data.remote.dto.auth.RegisterRequest
import com.forerun.customer.data.remote.token.TokenRefreshManager
import com.forerun.customer.domain.model.SessionState
import com.forerun.customer.domain.model.User
import com.forerun.customer.domain.model.UserStatus
import com.forerun.customer.domain.repository.AuthRepository
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
    private val tokenStorage: TokenStorage,
    private val onboardingPrefs: OnboardingPrefs,
    private val tokenRefreshManager: TokenRefreshManager,
    private val fcmTokenManager: com.forerun.customer.core.notification.FcmTokenManager? = null,
    private val socketManager: com.forerun.customer.core.websocket.SocketManager? = null,
    private val customerApiProvider: javax.inject.Provider<com.forerun.customer.data.remote.api.CustomerApi>? = null
) : AuthRepository {

    override suspend fun login(whatsapp: String, password: String): ApiResponse<User> {
        val request = LoginRequest(whatsapp = whatsapp, password = password)
        return when (val response = authApi.login(request)) {
            is ApiResponse.Success -> {
                val data = response.data
                val expiry = if (data.expiresIn != null && data.expiresIn > 0) {
                    val millis = if (data.expiresIn < 10_000_000) data.expiresIn * 1000L else data.expiresIn
                    System.currentTimeMillis() + millis
                } else {
                    System.currentTimeMillis() + 15 * 60 * 1000L // Default 15 minutes
                }

                tokenStorage.saveAuthTokens(
                    accessToken = data.accessToken,
                    refreshToken = data.refreshToken,
                    expiryTimestamp = expiry
                )
                tokenStorage.setUserId(data.user.id)
                tokenStorage.setUserName(data.user.name)
                tokenStorage.setUserRole(data.user.role)
                tokenStorage.setUserStatus(data.user.status)

                val user = User(
                    id = data.user.id,
                    name = data.user.name,
                    role = data.user.role,
                    status = UserStatus.fromString(data.user.status)
                )

                try {
                    fcmTokenManager?.registerDeviceToken()
                } catch (_: Exception) {}

                try {
                    socketManager?.connect()
                } catch (_: Exception) {}

                ApiResponse.Success(user)
            }
            is ApiResponse.Error -> {
                ApiResponse.Error(
                    statusCode = response.statusCode,
                    error = response.error,
                    message = response.message
                )
            }
        }
    }

    override suspend fun register(
        name: String,
        whatsapp: String,
        altPhone: String?,
        password: String,
        lat: Double,
        lng: Double,
        description: String
    ): ApiResponse<String> {
        val request = RegisterRequest(
            name = name,
            whatsapp = whatsapp,
            altPhone = altPhone,
            password = password,
            address = AddressDto(
                lat = lat,
                lng = lng,
                description = description
            )
        )
        return when (val response = authApi.register(request)) {
            is ApiResponse.Success -> {
                ApiResponse.Success(response.data.userId ?: response.data.message ?: "")
            }
            is ApiResponse.Error -> {
                ApiResponse.Error(
                    statusCode = response.statusCode,
                    error = response.error,
                    message = response.message
                )
            }
        }
    }

    override suspend fun logout(): ApiResponse<Unit> {
        try {
            fcmTokenManager?.unregisterDeviceToken()
        } catch (_: Exception) {}

        try {
            socketManager?.disconnect()
        } catch (_: Exception) {}

        val refreshToken = tokenStorage.getRefreshToken()
        if (!refreshToken.isNullOrBlank()) {
            try {
                authApi.logout(LogoutRequest(refreshToken))
            } catch (_: Exception) {
                // Logout endpoint error shouldn't prevent clearing local credentials
            }
        }
        tokenStorage.clearAll()
        return ApiResponse.Success(Unit)
    }

    override suspend fun checkSession(): SessionState {
        val isOnboardingSeen = onboardingPrefs.isOnboardingSeen.first()
        if (!isOnboardingSeen) {
            return SessionState.NeedsOnboarding
        }

        var hasValidToken = tokenStorage.hasValidAccessToken()
        if (!hasValidToken) {
            val refreshToken = tokenStorage.getRefreshToken()
            if (!refreshToken.isNullOrBlank()) {
                val refreshed = tokenRefreshManager.refreshTokenIfNeeded(force = false)
                if (refreshed) {
                    hasValidToken = tokenStorage.hasValidAccessToken()
                }
            }
        }

        if (hasValidToken) {
            // Refresh user status from server if possible (handles pending verification approval)
            try {
                val customerApi = customerApiProvider?.get()
                if (customerApi != null) {
                    when (val profileRes = customerApi.me()) {
                        is ApiResponse.Success -> {
                            tokenStorage.setUserStatus(profileRes.data.status)
                            tokenStorage.setUserName(profileRes.data.name)
                        }
                        is ApiResponse.Error -> {
                            if (profileRes.statusCode == 401) {
                                val refreshed = tokenRefreshManager.refreshTokenIfNeeded(force = true)
                                if (refreshed) {
                                    val retryRes = customerApi.me()
                                    if (retryRes is ApiResponse.Success) {
                                        tokenStorage.setUserStatus(retryRes.data.status)
                                        tokenStorage.setUserName(retryRes.data.name)
                                    }
                                } else {
                                    return SessionState.Unauthenticated
                                }
                            }
                        }
                    }
                }
            } catch (_: Exception) {
                // Network failure: proceed with cached user credentials
            }

            val user = getCurrentUser()
            return if (user != null) {
                SessionState.Authenticated(user)
            } else {
                SessionState.Unauthenticated
            }
        }

        // Token expired: try refresh if refresh token exists
        val refreshToken = tokenStorage.getRefreshToken()
        if (!refreshToken.isNullOrBlank()) {
            val refreshed = tokenRefreshManager.refreshTokenIfNeeded()
            if (refreshed) {
                val user = getCurrentUser()
                if (user != null) {
                    return SessionState.Authenticated(user)
                }
            }
        }

        return SessionState.Unauthenticated
    }

    override fun getCurrentUser(): User? {
        val id = tokenStorage.getUserId() ?: return null
        val name = tokenStorage.getUserName() ?: ""
        val role = tokenStorage.getUserRole() ?: "CUSTOMER"
        val status = UserStatus.fromString(tokenStorage.getUserStatus())
        return User(id = id, name = name, role = role, status = status)
    }
}

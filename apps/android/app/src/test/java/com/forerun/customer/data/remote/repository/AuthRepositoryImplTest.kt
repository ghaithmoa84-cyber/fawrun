package com.forerun.customer.data.remote.repository

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.core.storage.OnboardingPrefs
import com.forerun.customer.core.storage.TokenStorage
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.LoginRequest
import com.forerun.customer.data.remote.dto.auth.LoginResponse
import com.forerun.customer.data.remote.dto.auth.LogoutRequest
import com.forerun.customer.data.remote.dto.auth.RefreshRequest
import com.forerun.customer.data.remote.dto.auth.RefreshResponse
import com.forerun.customer.data.remote.dto.auth.RegisterRequest
import com.forerun.customer.data.remote.dto.auth.RegisterResponse
import com.forerun.customer.data.remote.dto.auth.UserDto
import com.forerun.customer.data.remote.token.TokenRefreshManager
import com.forerun.customer.domain.model.SessionState
import com.forerun.customer.domain.model.UserStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import javax.inject.Provider

class AuthRepositoryImplTest {

    private class FakeAuthApi : AuthApi {
        var loginResult: ApiResponse<LoginResponse> = ApiResponse.Success(
            LoginResponse(
                accessToken = "access_token_123",
                refreshToken = "refresh_token_123",
                expiresIn = 900L,
                user = UserDto(id = "user_1", name = "Test User", role = "CUSTOMER", status = "VERIFIED")
            )
        )

        var registerResult: ApiResponse<RegisterResponse> = ApiResponse.Success(
            RegisterResponse(
                statusCode = 201,
                message = "Account created",
                userId = "user_new"
            )
        )

        override suspend fun login(body: LoginRequest): ApiResponse<LoginResponse> = loginResult
        override suspend fun register(body: RegisterRequest): ApiResponse<RegisterResponse> = registerResult
        override suspend fun refresh(body: RefreshRequest): ApiResponse<RefreshResponse> =
            ApiResponse.Success(RefreshResponse("new_access", "new_refresh"))
        override suspend fun logout(body: LogoutRequest): ApiResponse<Unit> = ApiResponse.Success(Unit)
    }

    private class FakeTokenStorage : TokenStorage {
        var backingAccessToken: String? = null
        var backingRefreshToken: String? = null
        var backingExpiry: Long = 0L
        var backingUserId: String? = null
        var backingUserName: String? = null
        var backingUserRole: String? = null
        var backingUserStatus: String? = null

        override fun getAccessToken(): String? = backingAccessToken
        override fun setAccessToken(token: String?) { backingAccessToken = token }
        override fun getRefreshToken(): String? = backingRefreshToken
        override fun setRefreshToken(token: String?) { backingRefreshToken = token }
        override fun getTokenExpiry(): Long = backingExpiry
        override fun setTokenExpiry(expiry: Long) { this.backingExpiry = expiry }
        override fun getUserId(): String? = backingUserId
        override fun setUserId(id: String?) { backingUserId = id }
        override fun getUserName(): String? = backingUserName
        override fun setUserName(name: String?) { backingUserName = name }
        override fun getUserRole(): String? = backingUserRole
        override fun setUserRole(role: String?) { backingUserRole = role }
        override fun getUserStatus(): String? = backingUserStatus
        override fun setUserStatus(status: String?) { backingUserStatus = status }
        override fun saveAuthTokens(accessToken: String, refreshToken: String, expiryTimestamp: Long) {
            this.backingAccessToken = accessToken
            this.backingRefreshToken = refreshToken
            this.backingExpiry = expiryTimestamp
        }
        override fun clearAll() {
            backingAccessToken = null
            backingRefreshToken = null
            backingExpiry = 0L
            backingUserId = null
            backingUserName = null
            backingUserRole = null
            backingUserStatus = null
        }
        override fun clearAccessTokenOnly() {
            backingAccessToken = null
            backingExpiry = 0L
        }
        override fun hasValidAccessToken(): Boolean = !backingAccessToken.isNullOrBlank() && (backingExpiry == 0L || backingExpiry > System.currentTimeMillis())
    }

    private class FakeOnboardingPrefs(private var seen: Boolean) : OnboardingPrefs {
        override val isOnboardingSeen: Flow<Boolean>
            get() = flowOf(seen)
        override suspend fun setSeen(seen: Boolean) {
            this.seen = seen
        }
    }

    @Test
    fun login_success_saves_tokens_and_returns_user() = runTest {
        val fakeApi = FakeAuthApi()
        val fakeStorage = FakeTokenStorage()
        val fakePrefs = FakeOnboardingPrefs(seen = true)
        val refreshManager = TokenRefreshManager(fakeStorage, Provider { fakeApi })

        val repository = AuthRepositoryImpl(
            authApi = fakeApi,
            tokenStorage = fakeStorage,
            onboardingPrefs = fakePrefs,
            tokenRefreshManager = refreshManager
        )

        val result = repository.login("0912345678", "password123")
        assertTrue(result is ApiResponse.Success)
        val user = (result as ApiResponse.Success).data
        assertEquals("user_1", user.id)
        assertEquals("Test User", user.name)
        assertEquals(UserStatus.VERIFIED, user.status)
        assertEquals("access_token_123", fakeStorage.getAccessToken())
        assertEquals("refresh_token_123", fakeStorage.getRefreshToken())
    }

    @Test
    fun checkSession_when_onboarding_not_seen_returns_NeedsOnboarding() = runTest {
        val fakeApi = FakeAuthApi()
        val fakeStorage = FakeTokenStorage()
        val fakePrefs = FakeOnboardingPrefs(seen = false)
        val refreshManager = TokenRefreshManager(fakeStorage, Provider { fakeApi })

        val repository = AuthRepositoryImpl(
            authApi = fakeApi,
            tokenStorage = fakeStorage,
            onboardingPrefs = fakePrefs,
            tokenRefreshManager = refreshManager
        )

        val session = repository.checkSession()
        assertEquals(SessionState.NeedsOnboarding, session)
    }

    @Test
    fun checkSession_when_authenticated_returns_Authenticated_user() = runTest {
        val fakeApi = FakeAuthApi()
        val fakeStorage = FakeTokenStorage().apply {
            setAccessToken("valid_token")
            setTokenExpiry(System.currentTimeMillis() + 60_000L)
            setUserId("user_42")
            setUserName("Ahmad")
            setUserRole("CUSTOMER")
            setUserStatus("VERIFIED")
        }
        val fakePrefs = FakeOnboardingPrefs(seen = true)
        val refreshManager = TokenRefreshManager(fakeStorage, Provider { fakeApi })

        val repository = AuthRepositoryImpl(
            authApi = fakeApi,
            tokenStorage = fakeStorage,
            onboardingPrefs = fakePrefs,
            tokenRefreshManager = refreshManager
        )

        val session = repository.checkSession()
        assertTrue(session is SessionState.Authenticated)
        val user = (session as SessionState.Authenticated).user
        assertEquals("user_42", user.id)
        assertEquals("Ahmad", user.name)
        assertEquals(UserStatus.VERIFIED, user.status)
    }
}

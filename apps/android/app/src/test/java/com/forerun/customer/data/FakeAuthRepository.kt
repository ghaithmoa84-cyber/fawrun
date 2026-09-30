package com.forerun.customer.data

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.domain.model.SessionState
import com.forerun.customer.domain.model.User
import com.forerun.customer.domain.model.UserStatus
import com.forerun.customer.domain.repository.AuthRepository

class FakeAuthRepository : AuthRepository {
    var loginResult: ApiResponse<User> = ApiResponse.Success(
        User(
            id = "user_test_1",
            name = "مستخدم تجريبي",
            role = "CUSTOMER",
            status = UserStatus.VERIFIED
        )
    )

    var registerResult: ApiResponse<String> = ApiResponse.Success("user_test_new")
    var logoutResult: ApiResponse<Unit> = ApiResponse.Success(Unit)
    var sessionStateResult: SessionState = SessionState.Unauthenticated
    var currentUserResult: User? = null
    var logoutCallCount = 0

    override suspend fun login(whatsapp: String, password: String): ApiResponse<User> {
        return loginResult
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
        return registerResult
    }

    override suspend fun logout(): ApiResponse<Unit> {
        logoutCallCount++
        return logoutResult
    }

    override suspend fun checkSession(): SessionState {
        return sessionStateResult
    }

    override fun getCurrentUser(): User? {
        return currentUserResult
    }
}

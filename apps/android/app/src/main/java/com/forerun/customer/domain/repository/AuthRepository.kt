package com.forerun.customer.domain.repository

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.domain.model.SessionState
import com.forerun.customer.domain.model.User

interface AuthRepository {
    suspend fun login(whatsapp: String, password: String): ApiResponse<User>
    suspend fun register(
        name: String,
        whatsapp: String,
        altPhone: String?,
        password: String,
        lat: Double,
        lng: Double,
        description: String
    ): ApiResponse<String>
    suspend fun logout(): ApiResponse<Unit>
    suspend fun checkSession(): SessionState
    fun getCurrentUser(): User?
}

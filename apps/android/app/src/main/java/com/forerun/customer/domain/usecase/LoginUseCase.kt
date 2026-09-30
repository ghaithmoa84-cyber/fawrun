package com.forerun.customer.domain.usecase

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.domain.model.User
import com.forerun.customer.domain.repository.AuthRepository
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(whatsapp: String, password: String): ApiResponse<User> {
        val cleanPhone = whatsapp.trim()
        return authRepository.login(cleanPhone, password)
    }
}

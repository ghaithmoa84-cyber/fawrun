package com.forerun.customer.domain.usecase

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.domain.repository.AuthRepository
import javax.inject.Inject

class LogoutUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(): ApiResponse<Unit> {
        return authRepository.logout()
    }
}

package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.model.SessionState
import com.forerun.customer.domain.repository.AuthRepository
import javax.inject.Inject

class CheckSessionUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(): SessionState {
        return authRepository.checkSession()
    }
}

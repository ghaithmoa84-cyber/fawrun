package com.forerun.customer.domain.usecase

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.domain.repository.AuthRepository
import javax.inject.Inject

class RegisterUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(
        name: String,
        whatsapp: String,
        altPhone: String?,
        password: String,
        lat: Double,
        lng: Double,
        description: String
    ): ApiResponse<String> {
        return authRepository.register(
            name = name.trim(),
            whatsapp = whatsapp.trim(),
            altPhone = altPhone?.trim()?.takeIf { it.isNotEmpty() },
            password = password,
            lat = lat,
            lng = lng,
            description = description.trim()
        )
    }
}

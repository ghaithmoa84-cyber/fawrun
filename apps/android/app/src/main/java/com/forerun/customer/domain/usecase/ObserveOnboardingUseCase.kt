package com.forerun.customer.domain.usecase

import com.forerun.customer.core.storage.OnboardingPrefs
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class ObserveOnboardingUseCase @Inject constructor(
    private val onboardingPrefs: OnboardingPrefs
) {
    operator fun invoke(): Flow<Boolean> = onboardingPrefs.isOnboardingSeen

    suspend fun completeOnboarding() {
        onboardingPrefs.setSeen(true)
    }

    suspend fun setSeen(seen: Boolean) {
        onboardingPrefs.setSeen(seen)
    }
}

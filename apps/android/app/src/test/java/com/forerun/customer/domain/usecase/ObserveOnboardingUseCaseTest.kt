package com.forerun.customer.domain.usecase

import com.forerun.customer.core.storage.OnboardingPrefs
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ObserveOnboardingUseCaseTest {

    private class FakeOnboardingPrefs(var seen: Boolean) : OnboardingPrefs {
        override val isOnboardingSeen: Flow<Boolean>
            get() = flowOf(seen)

        override suspend fun setSeen(seen: Boolean) {
            this.seen = seen
        }
    }

    @Test
    fun invoke_returns_onboarding_status_flow() = runTest {
        val prefs = FakeOnboardingPrefs(seen = false)
        val useCase = ObserveOnboardingUseCase(prefs)

        val result = useCase().first()
        assertEquals(false, result)
    }

    @Test
    fun completeOnboarding_sets_seen_to_true() = runTest {
        val prefs = FakeOnboardingPrefs(seen = false)
        val useCase = ObserveOnboardingUseCase(prefs)

        useCase.completeOnboarding()
        assertTrue(prefs.seen)
    }

    @Test
    fun setSeen_updates_seen_state() = runTest {
        val prefs = FakeOnboardingPrefs(seen = false)
        val useCase = ObserveOnboardingUseCase(prefs)

        useCase.setSeen(true)
        assertTrue(prefs.seen)
    }
}

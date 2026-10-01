package com.forerun.customer.ui.onboarding

import app.cash.turbine.test
import com.forerun.customer.core.storage.OnboardingPrefs
import com.forerun.customer.domain.usecase.ObserveOnboardingUseCase
import com.forerun.customer.util.MainDispatcherRule
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class OnboardingViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private class FakeOnboardingPrefs(var seen: Boolean) : OnboardingPrefs {
        override val isOnboardingSeen: Flow<Boolean>
            get() = flowOf(seen)

        override suspend fun setSeen(seen: Boolean) {
            this.seen = seen
        }
    }

    @Test
    fun completeOnboarding_sets_seen_and_emits_navigation() = runTest {
        val prefs = FakeOnboardingPrefs(seen = false)
        val useCase = ObserveOnboardingUseCase(prefs)
        val viewModel = OnboardingViewModel(useCase)

        viewModel.navigateToLogin.test {
            viewModel.completeOnboarding()
            awaitItem()
            assertTrue(prefs.seen)
        }
    }
}

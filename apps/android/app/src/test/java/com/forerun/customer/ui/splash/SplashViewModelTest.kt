package com.forerun.customer.ui.splash

import app.cash.turbine.test
import com.forerun.customer.data.FakeAuthRepository
import com.forerun.customer.domain.model.SessionState
import com.forerun.customer.domain.model.User
import com.forerun.customer.domain.model.UserStatus
import com.forerun.customer.domain.usecase.CheckSessionUseCase
import com.forerun.customer.util.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SplashViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun splash_when_onboarding_needed_routes_to_onboarding() = runTest {
        val fakeRepo = FakeAuthRepository().apply {
            sessionStateResult = SessionState.NeedsOnboarding
        }
        val useCase = CheckSessionUseCase(fakeRepo)
        val viewModel = SplashViewModel(useCase)

        viewModel.destination.test {
            advanceTimeBy(600)
            val destination = awaitItem()
            assertEquals(SplashDestination.Onboarding, destination)
        }
    }

    @Test
    fun splash_when_unauthenticated_routes_to_login() = runTest {
        val fakeRepo = FakeAuthRepository().apply {
            sessionStateResult = SessionState.Unauthenticated
        }
        val useCase = CheckSessionUseCase(fakeRepo)
        val viewModel = SplashViewModel(useCase)

        viewModel.destination.test {
            advanceTimeBy(600)
            val destination = awaitItem()
            assertEquals(SplashDestination.Login, destination)
        }
    }

    @Test
    fun splash_when_verified_routes_to_home() = runTest {
        val fakeRepo = FakeAuthRepository().apply {
            sessionStateResult = SessionState.Authenticated(
                User("user_1", "Test", "CUSTOMER", UserStatus.VERIFIED)
            )
        }
        val useCase = CheckSessionUseCase(fakeRepo)
        val viewModel = SplashViewModel(useCase)

        viewModel.destination.test {
            advanceTimeBy(600)
            val destination = awaitItem()
            assertEquals(SplashDestination.Home, destination)
        }
    }

    @Test
    fun splash_when_pending_routes_to_pending_verification() = runTest {
        val fakeRepo = FakeAuthRepository().apply {
            sessionStateResult = SessionState.Authenticated(
                User("user_2", "Pending User", "CUSTOMER", UserStatus.PENDING_VERIFICATION)
            )
        }
        val useCase = CheckSessionUseCase(fakeRepo)
        val viewModel = SplashViewModel(useCase)

        viewModel.destination.test {
            advanceTimeBy(600)
            val destination = awaitItem()
            assertEquals(SplashDestination.PendingVerification, destination)
        }
    }

    @Test
    fun splash_when_suspended_routes_to_suspended() = runTest {
        val fakeRepo = FakeAuthRepository().apply {
            sessionStateResult = SessionState.Authenticated(
                User("user_3", "Suspended User", "CUSTOMER", UserStatus.SUSPENDED)
            )
        }
        val useCase = CheckSessionUseCase(fakeRepo)
        val viewModel = SplashViewModel(useCase)

        viewModel.destination.test {
            advanceTimeBy(600)
            val destination = awaitItem()
            assertEquals(SplashDestination.Suspended, destination)
        }
    }
}

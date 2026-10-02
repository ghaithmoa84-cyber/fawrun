package com.forerun.customer.ui.auth.status

import app.cash.turbine.test
import com.forerun.customer.data.FakeAuthRepository
import com.forerun.customer.data.FakeOrderEventsGateway
import com.forerun.customer.domain.model.WebSocketEvent
import com.forerun.customer.domain.usecase.LogoutUseCase
import com.forerun.customer.domain.usecase.ObserveOrderEventsUseCase
import com.forerun.customer.util.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PendingVerificationViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `when AccountVerified event received navigateToHome becomes true`() = runTest {
        val fakeAuthRepository = FakeAuthRepository()
        val logoutUseCase = LogoutUseCase(fakeAuthRepository)
        val fakeGateway = FakeOrderEventsGateway()
        val observeOrderEventsUseCase = ObserveOrderEventsUseCase(fakeGateway)

        val viewModel = PendingVerificationViewModel(
            logoutUseCase = logoutUseCase,
            observeOrderEventsUseCase = observeOrderEventsUseCase
        )

        viewModel.navigateToHome.test {
            // Initially false
            assertFalse(awaitItem())

            // Emit AccountVerified from fake gateway
            fakeGateway.emitEvent(WebSocketEvent.AccountVerified)

            // Should become true
            assertTrue(awaitItem())

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `when logout called emits navigateToLogin`() = runTest {
        val fakeAuthRepository = FakeAuthRepository()
        val logoutUseCase = LogoutUseCase(fakeAuthRepository)
        val fakeGateway = FakeOrderEventsGateway()
        val observeOrderEventsUseCase = ObserveOrderEventsUseCase(fakeGateway)

        val viewModel = PendingVerificationViewModel(
            logoutUseCase = logoutUseCase,
            observeOrderEventsUseCase = observeOrderEventsUseCase
        )

        viewModel.navigateToLogin.test {
            viewModel.logout()
            awaitItem()
            cancelAndIgnoreRemainingEvents()
        }
    }
}

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

    @Test
    fun `when checkStatusManually called and user is verified navigateToHome becomes true`() = runTest {
        val fakeAuthRepository = FakeAuthRepository().apply {
            sessionStateResult = com.forerun.customer.domain.model.SessionState.Authenticated(
                com.forerun.customer.domain.model.User("user_1", "Test", "CUSTOMER", com.forerun.customer.domain.model.UserStatus.VERIFIED)
            )
        }
        val logoutUseCase = LogoutUseCase(fakeAuthRepository)
        val checkSessionUseCase = com.forerun.customer.domain.usecase.CheckSessionUseCase(fakeAuthRepository)
        val fakeGateway = FakeOrderEventsGateway()
        val observeOrderEventsUseCase = ObserveOrderEventsUseCase(fakeGateway)
        val fakeStorage = com.forerun.customer.core.storage.FakeTokenStorage(token = "valid_token")
        val fakeSocket = object : com.forerun.customer.core.websocket.SocketManager(fakeStorage) {}

        val viewModel = PendingVerificationViewModel(
            logoutUseCase = logoutUseCase,
            observeOrderEventsUseCase = observeOrderEventsUseCase,
            checkSessionUseCase = checkSessionUseCase,
            socketManager = fakeSocket
        )

        viewModel.navigateToHome.test {
            assertFalse(awaitItem())
            viewModel.checkStatusManually()
            assertTrue(awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }
}

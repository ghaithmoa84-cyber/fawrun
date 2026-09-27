package com.forerun.customer.ui.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.domain.model.SessionState
import com.forerun.customer.domain.model.UserStatus
import com.forerun.customer.domain.usecase.CheckSessionUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface SplashDestination {
    data object Onboarding : SplashDestination
    data object Login : SplashDestination
    data object Home : SplashDestination
    data object PendingVerification : SplashDestination
    data object Suspended : SplashDestination
}

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val checkSessionUseCase: CheckSessionUseCase
) : ViewModel() {

    private val _destination = MutableSharedFlow<SplashDestination>(replay = 1)
    val destination: SharedFlow<SplashDestination> = _destination.asSharedFlow()

    init {
        checkSession()
    }

    fun checkSession() {
        viewModelScope.launch {
            // A subtle delay for visual smoothness and branding display
            delay(500)
            try {
                kotlinx.coroutines.withTimeoutOrNull(4000L) {
                    when (val state = checkSessionUseCase()) {
                        is SessionState.NeedsOnboarding -> _destination.emit(SplashDestination.Onboarding)
                        is SessionState.Unauthenticated -> _destination.emit(SplashDestination.Login)
                        is SessionState.Authenticated -> {
                            when (state.user.status) {
                                UserStatus.VERIFIED -> _destination.emit(SplashDestination.Home)
                                UserStatus.PENDING_VERIFICATION -> _destination.emit(SplashDestination.PendingVerification)
                                UserStatus.SUSPENDED -> _destination.emit(SplashDestination.Suspended)
                                else -> _destination.emit(SplashDestination.Login)
                            }
                        }
                    }
                } ?: _destination.emit(SplashDestination.Login)
            } catch (_: Exception) {
                _destination.emit(SplashDestination.Login)
            }
        }
    }
}

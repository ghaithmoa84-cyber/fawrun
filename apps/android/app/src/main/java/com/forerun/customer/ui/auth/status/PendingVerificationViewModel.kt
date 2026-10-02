package com.forerun.customer.ui.auth.status

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.domain.gateway.OrderEventsGateway
import com.forerun.customer.domain.model.WebSocketEvent
import com.forerun.customer.domain.usecase.LogoutUseCase
import com.forerun.customer.domain.usecase.ObserveOrderEventsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PendingVerificationViewModel @Inject constructor(
    private val logoutUseCase: LogoutUseCase,
    private val observeOrderEventsUseCase: ObserveOrderEventsUseCase
) : ViewModel() {

    // Overload for testing or callers that don't supply observeOrderEventsUseCase
    constructor(
        logoutUseCase: LogoutUseCase
    ) : this(
        logoutUseCase = logoutUseCase,
        observeOrderEventsUseCase = ObserveOrderEventsUseCase(object : OrderEventsGateway {
            override fun observeEvents(): Flow<WebSocketEvent> = emptyFlow()
        })
    )

    private val _isLoggingOut = MutableStateFlow(false)
    val isLoggingOut: StateFlow<Boolean> = _isLoggingOut.asStateFlow()

    private val _navigateToLogin = MutableSharedFlow<Unit>()
    val navigateToLogin: SharedFlow<Unit> = _navigateToLogin.asSharedFlow()

    private val _navigateToHome = MutableStateFlow(false)
    val navigateToHome: StateFlow<Boolean> = _navigateToHome.asStateFlow()

    init {
        observeVerification()
    }

    private fun observeVerification() {
        viewModelScope.launch {
            observeOrderEventsUseCase().collect { event ->
                if (event is WebSocketEvent.AccountVerified) {
                    _navigateToHome.value = true
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            _isLoggingOut.value = true
            logoutUseCase()
            _isLoggingOut.value = false
            _navigateToLogin.emit(Unit)
        }
    }
}

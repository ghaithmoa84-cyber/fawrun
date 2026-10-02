package com.forerun.customer.ui.auth.status

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.core.websocket.SocketManager
import com.forerun.customer.domain.gateway.OrderEventsGateway
import com.forerun.customer.domain.model.SessionState
import com.forerun.customer.domain.model.UserStatus
import com.forerun.customer.domain.model.WebSocketEvent
import com.forerun.customer.domain.repository.AuthRepository
import com.forerun.customer.domain.usecase.CheckSessionUseCase
import com.forerun.customer.domain.usecase.LogoutUseCase
import com.forerun.customer.domain.usecase.ObserveOrderEventsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PendingVerificationViewModel @Inject constructor(
    private val logoutUseCase: LogoutUseCase,
    private val observeOrderEventsUseCase: ObserveOrderEventsUseCase,
    private val checkSessionUseCase: CheckSessionUseCase,
    private val socketManager: SocketManager
) : ViewModel() {

    // Overload for testing or callers that don't supply checkSessionUseCase or socketManager
    constructor(
        logoutUseCase: LogoutUseCase,
        observeOrderEventsUseCase: ObserveOrderEventsUseCase
    ) : this(
        logoutUseCase = logoutUseCase,
        observeOrderEventsUseCase = observeOrderEventsUseCase,
        checkSessionUseCase = CheckSessionUseCase(object : AuthRepository {
            override suspend fun login(whatsapp: String, password: String) = ApiResponse.Error(400, "NOT_IMPLEMENTED", "Not implemented")
            override suspend fun register(name: String, whatsapp: String, altPhone: String?, password: String, lat: Double, lng: Double, description: String) = ApiResponse.Error(400, "NOT_IMPLEMENTED", "Not implemented")
            override suspend fun logout() = ApiResponse.Success(Unit)
            override suspend fun checkSession() = SessionState.Unauthenticated
            override fun getCurrentUser() = null
        }),
        socketManager = object : SocketManager(object : com.forerun.customer.core.storage.TokenStorage {
            override fun getAccessToken(): String? = null
            override fun setAccessToken(token: String?) {}
            override fun getRefreshToken(): String? = null
            override fun setRefreshToken(token: String?) {}
            override fun getTokenExpiry(): Long = 0L
            override fun setTokenExpiry(expiry: Long) {}
            override fun getUserId(): String? = null
            override fun setUserId(id: String?) {}
            override fun getUserName(): String? = null
            override fun setUserName(name: String?) {}
            override fun getUserRole(): String? = null
            override fun setUserRole(role: String?) {}
            override fun getUserStatus(): String? = null
            override fun setUserStatus(status: String?) {}
            override fun saveAuthTokens(accessToken: String, refreshToken: String, expiryTimestamp: Long) {}
            override fun clearAll() {}
            override fun clearAccessTokenOnly() {}
            override fun hasValidAccessToken(): Boolean = false
        }) {}
    )

    // Overload for testing or callers that only supply logoutUseCase
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

    private val _isCheckingStatus = MutableStateFlow(false)
    val isCheckingStatus: StateFlow<Boolean> = _isCheckingStatus.asStateFlow()

    private val _navigateToLogin = MutableSharedFlow<Unit>()
    val navigateToLogin: SharedFlow<Unit> = _navigateToLogin.asSharedFlow()

    private val _navigateToHome = MutableStateFlow(false)
    val navigateToHome: StateFlow<Boolean> = _navigateToHome.asStateFlow()

    private var pollingJob: kotlinx.coroutines.Job? = null

    init {
        // Ensure WebSocket is connected for pending verification updates
        try {
            socketManager.connect()
        } catch (_: Exception) {}

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

    fun startPollingStatus() {
        if (pollingJob?.isActive == true) return
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(6000L)
                try {
                    val sessionState = checkSessionUseCase()
                    if (sessionState is SessionState.Authenticated && sessionState.user.status == UserStatus.VERIFIED) {
                        _navigateToHome.value = true
                        break
                    }
                } catch (_: Exception) {
                    // Network errors during polling are ignored
                }
            }
        }
    }

    fun stopPollingStatus() {
        pollingJob?.cancel()
        pollingJob = null
    }

    override fun onCleared() {
        super.onCleared()
        stopPollingStatus()
    }

    fun checkStatusManually() {
        if (_isCheckingStatus.value) return
        viewModelScope.launch {
            _isCheckingStatus.value = true
            try {
                val sessionState = checkSessionUseCase()
                if (sessionState is SessionState.Authenticated && sessionState.user.status == UserStatus.VERIFIED) {
                    _navigateToHome.value = true
                }
            } catch (_: Exception) {
            } finally {
                _isCheckingStatus.value = false
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

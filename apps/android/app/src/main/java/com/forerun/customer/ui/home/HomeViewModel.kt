package com.forerun.customer.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.domain.model.ActiveOrder
import com.forerun.customer.domain.model.CustomerProfile
import com.forerun.customer.domain.usecase.GetHomeDataUseCase
import com.forerun.customer.domain.usecase.LogoutUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Success(
        val profile: CustomerProfile,
        val activeOrder: ActiveOrder? = null
    ) : HomeUiState
    data class Error(val message: String) : HomeUiState
}

sealed interface HomeIntent {
    data object Refresh : HomeIntent
    data object Logout : HomeIntent
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getHomeDataUseCase: GetHomeDataUseCase,
    private val logoutUseCase: LogoutUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _navigateToLogin = MutableSharedFlow<Unit>()
    val navigateToLogin: SharedFlow<Unit> = _navigateToLogin.asSharedFlow()

    init {
        loadHomeData()
    }

    fun handleIntent(intent: HomeIntent) {
        when (intent) {
            is HomeIntent.Refresh -> loadHomeData()
            is HomeIntent.Logout -> logout()
        }
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            getHomeDataUseCase()
                .onSuccess { data ->
                    _uiState.value = HomeUiState.Success(
                        profile = data.profile,
                        activeOrder = data.activeOrder
                    )
                }
                .onFailure { throwable ->
                    _uiState.value = HomeUiState.Error(
                        message = throwable.message ?: "تعذر تحميل البيانات"
                    )
                }
        }
    }

    fun logout() {
        viewModelScope.launch {
            logoutUseCase()
            _navigateToLogin.emit(Unit)
        }
    }
}

package com.forerun.customer.ui.auth.register

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.R
import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.domain.usecase.RegisterUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RegisterUiState(
    val name: String = "",
    val whatsapp: String = "",
    val altPhone: String = "",
    val password: String = "",
    val addressDescription: String = "القنجرة - الشارع الرئيسي",
    val lat: Double = 35.5234,
    val lng: Double = 35.9876,
    val isLoading: Boolean = false,
    val nameErrorRes: Int? = null,
    val whatsappErrorRes: Int? = null,
    val altPhoneErrorRes: Int? = null,
    val passwordErrorRes: Int? = null,
    val addressErrorRes: Int? = null,
    val generalError: String? = null
)

sealed interface RegisterNavigationEvent {
    data object Success : RegisterNavigationEvent
    data object NavigateToLogin : RegisterNavigationEvent
}

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val registerUseCase: RegisterUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    private val _navigationEvent = MutableSharedFlow<RegisterNavigationEvent>()
    val navigationEvent: SharedFlow<RegisterNavigationEvent> = _navigationEvent.asSharedFlow()

    fun onNameChanged(value: String) {
        _uiState.update {
            it.copy(name = value, nameErrorRes = null, generalError = null)
        }
    }

    fun onWhatsappChanged(value: String) {
        val filtered = value.filter { it.isDigit() }.take(10)
        _uiState.update {
            it.copy(whatsapp = filtered, whatsappErrorRes = null, generalError = null)
        }
    }

    fun onAltPhoneChanged(value: String) {
        val filtered = value.filter { it.isDigit() }.take(10)
        _uiState.update {
            it.copy(altPhone = filtered, altPhoneErrorRes = null, generalError = null)
        }
    }

    fun onPasswordChanged(value: String) {
        _uiState.update {
            it.copy(password = value, passwordErrorRes = null, generalError = null)
        }
    }

    fun onAddressDescriptionChanged(value: String) {
        _uiState.update {
            it.copy(addressDescription = value, addressErrorRes = null, generalError = null)
        }
    }

    fun onLoginClicked() {
        viewModelScope.launch {
            _navigationEvent.emit(RegisterNavigationEvent.NavigateToLogin)
        }
    }

    fun register() {
        if (_uiState.value.isLoading) return
        val state = _uiState.value
        val isNameValid = state.name.trim().length >= 2
        val isWhatsappValid = state.whatsapp.matches(Regex("^09\\d{8}$"))
        val isAltPhoneValid = state.altPhone.isBlank() || state.altPhone.matches(Regex("^09\\d{8}$"))
        val isPasswordValid = state.password.length >= 8
        val isAddressValid = state.addressDescription.isNotBlank()

        if (!isNameValid || !isWhatsappValid || !isAltPhoneValid || !isPasswordValid || !isAddressValid) {
            _uiState.update {
                it.copy(
                    nameErrorRes = if (!isNameValid) R.string.error_name_short else null,
                    whatsappErrorRes = if (!isWhatsappValid) R.string.error_phone_invalid else null,
                    altPhoneErrorRes = if (!isAltPhoneValid) R.string.error_phone_invalid else null,
                    passwordErrorRes = if (!isPasswordValid) R.string.error_password_short else null,
                    addressErrorRes = if (!isAddressValid) R.string.error_address_required else null
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }
            val response = registerUseCase(
                name = state.name,
                whatsapp = state.whatsapp,
                altPhone = state.altPhone.ifBlank { null },
                password = state.password,
                lat = state.lat,
                lng = state.lng,
                description = state.addressDescription
            )

            when (response) {
                is ApiResponse.Success -> {
                    _uiState.update { it.copy(isLoading = false) }
                    _navigationEvent.emit(RegisterNavigationEvent.Success)
                }
                is ApiResponse.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            generalError = response.message.ifBlank { "حدث خطأ أثناء إنشاء الحساب" }
                        )
                    }
                }
            }
        }
    }
}

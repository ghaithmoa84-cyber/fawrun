package com.forerun.customer.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.data.remote.dto.customer.CustomerProfileDto
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.repository.AccountRepository
import com.forerun.customer.domain.repository.AddressResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AccountUiState(
    val isLoading: Boolean = true,
    val profile: CustomerProfileDto? = null,
    val address: CustomerAddress? = null,
    val isSavingProfile: Boolean = false,
    val isChangingPassword: Boolean = false,
    val isLoggingOut: Boolean = false,
    val errorMessage: String? = null,
    // Failures of the initial profile/address fetch. Kept apart from
    // errorMessage (which also carries validation and save errors) so the screen
    // can offer a retry for the recoverable case only.
    val loadErrorMessage: String? = null,
    val profileSuccessMessage: String? = null,
    val passwordSuccessMessage: String? = null
)

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val accountRepository: AccountRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AccountUiState())
    val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

    private val _navigateToLogin = MutableSharedFlow<Unit>()
    val navigateToLogin: SharedFlow<Unit> = _navigateToLogin.asSharedFlow()

    init {
        loadAccountData()
    }

    fun loadAccountData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null, loadErrorMessage = null)

            val profileResult = accountRepository.getProfile()
            val addressResult = accountRepository.getAddress()

            var profile: CustomerProfileDto? = null
            var error: String? = null

            profileResult.fold(
                onSuccess = { profile = it },
                onFailure = { error = it.message ?: "فشل في تحميل بيانات الحساب" }
            )

            var address: CustomerAddress? = null
            when (addressResult) {
                is AddressResult.Success -> address = addressResult.address
                is AddressResult.NotFound -> { /* No address set yet */ }
                is AddressResult.Error -> {
                    if (error == null) error = addressResult.message
                }
            }

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                profile = profile,
                address = address,
                errorMessage = null,
                loadErrorMessage = error
            )
        }
    }

    fun saveProfile(name: String, altPhone: String?) {
        updateProfile(name, altPhone)
    }

    fun updateProfile(name: String, altPhone: String?) {
        val trimmedName = name.trim()
        if (trimmedName.length < 2) {
            _uiState.value = _uiState.value.copy(errorMessage = "الاسم يجب أن يكون حرفين على الأقل")
            return
        }

        val trimmedAltPhone = altPhone?.trim()?.ifEmpty { null }
        if (trimmedAltPhone != null && !trimmedAltPhone.matches(Regex("^09\\d{8}$"))) {
            _uiState.value = _uiState.value.copy(errorMessage = "الرقم البديل يجب أن يبدأ بـ 09 ويتكون من 10 أرقام")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingProfile = true,
                errorMessage = null,
                profileSuccessMessage = null
            )
            val request = com.forerun.customer.data.remote.dto.customer.UpdateProfileRequest(
                name = trimmedName,
                altPhone = trimmedAltPhone
            )
            val result = accountRepository.updateProfile(request)
            result.fold(
                onSuccess = { updatedProfile ->
                    _uiState.value = _uiState.value.copy(
                        isSavingProfile = false,
                        profile = updatedProfile,
                        profileSuccessMessage = "تم حفظ معلومات الحساب بنجاح"
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isSavingProfile = false,
                        errorMessage = e.message ?: "فشل حفظ معلومات الحساب"
                    )
                }
            )
        }
    }

    fun changePassword(newPassword: String, confirmPassword: String) {
        if (newPassword.length < 8) {
            _uiState.value = _uiState.value.copy(errorMessage = "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
            return
        }
        if (newPassword.toByteArray(Charsets.UTF_8).size > 72) {
            _uiState.value = _uiState.value.copy(errorMessage = "كلمة المرور لا يجب أن تتجاوز 72 بايت")
            return
        }
        if (newPassword != confirmPassword) {
            _uiState.value = _uiState.value.copy(errorMessage = "كلمتا المرور غير متطابقتين")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isChangingPassword = true,
                errorMessage = null,
                passwordSuccessMessage = null
            )
            val request = com.forerun.customer.data.remote.dto.customer.ChangePasswordRequest(
                password = newPassword
            )
            val result = accountRepository.changePassword(request)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isChangingPassword = false,
                        passwordSuccessMessage = "تم تغيير كلمة المرور بنجاح"
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isChangingPassword = false,
                        errorMessage = e.message ?: "فشل تغيير كلمة المرور"
                    )
                }
            )
        }
    }

    fun logout() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoggingOut = true)
            accountRepository.logout()
            _uiState.value = _uiState.value.copy(isLoggingOut = false)
            _navigateToLogin.emit(Unit)
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(
            errorMessage = null,
            loadErrorMessage = null,
            profileSuccessMessage = null,
            passwordSuccessMessage = null
        )
    }
}

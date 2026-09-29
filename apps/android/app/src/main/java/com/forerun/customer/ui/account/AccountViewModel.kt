package com.forerun.customer.ui.account

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.core.storage.TokenStorage
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.LogoutRequest
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
    val isLoading: Boolean = false,
    val profile: CustomerProfileDto? = null,
    val address: CustomerAddress? = null,
    val isSavingProfile: Boolean = false,
    val isChangingPassword: Boolean = false,
    val isLoggingOut: Boolean = false,
    val errorMessage: String? = null,
    val profileSuccessMessage: String? = null,
    val passwordSuccessMessage: String? = null,
    val debugStatus: String? = null
)

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val accountRepository: AccountRepository,
    private val tokenStorage: TokenStorage,
    private val authApi: AuthApi
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
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

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
                errorMessage = error
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

    fun triggerSessionExpiry() {
        viewModelScope.launch {
            try {
                val refreshToken = tokenStorage.getRefreshToken()
                Log.d("ForerunTest", "triggerSessionExpiry: found refreshToken in storage")
                if (!refreshToken.isNullOrBlank()) {
                    val res = authApi.logout(LogoutRequest(refreshToken))
                    Log.d("ForerunTest", "authApi.logout executed on server: $res")
                }
                tokenStorage.clearAccessTokenOnly()
                Log.d("ForerunTest", "clearAccessTokenOnly completed. RefreshToken retained for S5b flow.")
                _uiState.value = _uiState.value.copy(debugStatus = "تم إبطال التوكن بنجاح! انتقل لشاشة Home واسحب للتحديث")
            } catch (e: Exception) {
                Log.e("ForerunTest", "Error triggering session expiry: ${e.message}", e)
                _uiState.value = _uiState.value.copy(debugStatus = "خطأ: ${e.message}")
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(
            errorMessage = null,
            profileSuccessMessage = null,
            passwordSuccessMessage = null
        )
    }
}

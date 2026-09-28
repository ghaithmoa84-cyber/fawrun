package com.forerun.customer.ui.account

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.core.storage.TokenStorage
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.LogoutRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val tokenStorage: TokenStorage,
    private val authApi: AuthApi
) : ViewModel() {

    private val _debugStatus = MutableStateFlow<String?>(null)
    val debugStatus: StateFlow<String?> = _debugStatus.asStateFlow()

    fun triggerSessionExpiry() {
        viewModelScope.launch {
            try {
                val refreshToken = tokenStorage.getRefreshToken()
                Log.d("ForerunTest", "triggerSessionExpiry: found refreshToken in storage")
                if (!refreshToken.isNullOrBlank()) {
                    val res = authApi.logout(LogoutRequest(refreshToken))
                    Log.d("ForerunTest", "authApi.logout executed on server: $res")
                }
                // Clear only the access token from storage, keeping the revoked refresh token
                tokenStorage.clearAccessTokenOnly()
                Log.d("ForerunTest", "clearAccessTokenOnly completed. RefreshToken retained for S5b flow.")
                _debugStatus.value = "تم إبطال التوكن بنجاح! انتقل لشاشة Home واسحب للتحديث"
            } catch (e: Exception) {
                Log.e("ForerunTest", "Error triggering session expiry: ${e.message}", e)
                _debugStatus.value = "خطأ: ${e.message}"
            }
        }
    }
}

package com.forerun.customer.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.core.storage.OnboardingPrefs
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val onboardingPrefs: OnboardingPrefs
) : ViewModel() {

    private val _navigateToLogin = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val navigateToLogin: SharedFlow<Unit> = _navigateToLogin.asSharedFlow()

    fun completeOnboarding() {
        viewModelScope.launch {
            onboardingPrefs.setSeen(true)
            _navigateToLogin.tryEmit(Unit)
        }
    }
}

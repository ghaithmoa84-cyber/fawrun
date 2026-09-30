package com.forerun.customer.domain.model

sealed interface SessionState {
    data object NeedsOnboarding : SessionState
    data object Unauthenticated : SessionState
    data class Authenticated(val user: User) : SessionState
}

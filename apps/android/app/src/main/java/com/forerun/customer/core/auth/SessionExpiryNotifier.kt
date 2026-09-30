package com.forerun.customer.core.auth

import kotlinx.coroutines.flow.SharedFlow

interface SessionExpiryNotifier {
    val sessionExpiredEvent: SharedFlow<Unit>
}

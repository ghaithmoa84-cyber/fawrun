package com.forerun.customer.core.notification

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeepLinkHolder @Inject constructor() {

    private val _pendingOrderId = MutableStateFlow<String?>(null)
    val pendingOrderId: StateFlow<String?> = _pendingOrderId.asStateFlow()

    fun setPendingOrderId(orderId: String?) {
        _pendingOrderId.value = orderId
    }

    fun consumePendingOrderId(): String? {
        val id = _pendingOrderId.value
        _pendingOrderId.value = null
        return id
    }

    fun peekPendingOrderId(): String? = _pendingOrderId.value
}

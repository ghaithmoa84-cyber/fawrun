package com.forerun.customer.ui.order.create

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.domain.model.CreatedOrder
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.model.OrderItem
import com.forerun.customer.domain.model.RunnerInfo
import com.forerun.customer.domain.repository.AddressResult
import com.forerun.customer.domain.usecase.CreateOrderUseCase
import com.forerun.customer.domain.usecase.GetAvailableRunnersUseCase
import com.forerun.customer.domain.usecase.GetCustomerAddressUseCase
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

data class CreateOrderUiState(
    val isLoadingAddress: Boolean = true,
    val isLoadingRunners: Boolean = false,
    val isSubmitting: Boolean = false,
    val deliveryAddress: CustomerAddress? = null,
    val items: List<OrderItem> = listOf(OrderItem(itemName = "", quantity = "")),
    val notes: String = "",
    val availableRunners: List<RunnerInfo> = emptyList(),
    val selectedRunnerId: String? = null,
    val waitForPreferred: Boolean = false,
    val validationError: String? = null,
    val createdOrder: CreatedOrder? = null,
    val errorMessage: String? = null
)

sealed interface CreateOrderIntent {
    data object LoadInitialData : CreateOrderIntent
    data object AddItem : CreateOrderIntent
    data class RemoveItem(val id: String) : CreateOrderIntent
    data class UpdateItemName(val id: String, val name: String) : CreateOrderIntent
    data class UpdateItemQuantity(val id: String, val quantity: String) : CreateOrderIntent
    data class ToggleItemAnyStore(val id: String, val anyStore: Boolean) : CreateOrderIntent
    data class UpdateItemCustomStore(val id: String, val customStoreName: String) : CreateOrderIntent
    data class UpdateNotes(val notes: String) : CreateOrderIntent
    data class SelectRunner(val runnerId: String?) : CreateOrderIntent
    data class ToggleWaitForPreferred(val wait: Boolean) : CreateOrderIntent
    data object SubmitOrder : CreateOrderIntent
    data object DismissSuccess : CreateOrderIntent
    data object ClearError : CreateOrderIntent
}

sealed interface CreateOrderEvent {
    data class OrderCreated(val order: CreatedOrder) : CreateOrderEvent
    data class ShowToast(val message: String) : CreateOrderEvent
}

@HiltViewModel
class CreateOrderViewModel @Inject constructor(
    private val createOrderUseCase: CreateOrderUseCase,
    private val getCustomerAddressUseCase: GetCustomerAddressUseCase,
    private val getAvailableRunnersUseCase: GetAvailableRunnersUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreateOrderUiState())
    val uiState: StateFlow<CreateOrderUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<CreateOrderEvent>()
    val events: SharedFlow<CreateOrderEvent> = _events.asSharedFlow()

    init {
        loadInitialData()
    }

    fun onIntent(intent: CreateOrderIntent) {
        when (intent) {
            is CreateOrderIntent.LoadInitialData -> loadInitialData()
            is CreateOrderIntent.AddItem -> addItem()
            is CreateOrderIntent.RemoveItem -> removeItem(intent.id)
            is CreateOrderIntent.UpdateItemName -> updateItemName(intent.id, intent.name)
            is CreateOrderIntent.UpdateItemQuantity -> updateItemQuantity(intent.id, intent.quantity)
            is CreateOrderIntent.ToggleItemAnyStore -> toggleItemAnyStore(intent.id, intent.anyStore)
            is CreateOrderIntent.UpdateItemCustomStore -> updateItemCustomStore(intent.id, intent.customStoreName)
            is CreateOrderIntent.UpdateNotes -> _uiState.update { it.copy(notes = intent.notes) }
            is CreateOrderIntent.SelectRunner -> _uiState.update { it.copy(selectedRunnerId = intent.runnerId) }
            is CreateOrderIntent.ToggleWaitForPreferred -> _uiState.update { it.copy(waitForPreferred = intent.wait) }
            is CreateOrderIntent.SubmitOrder -> submitOrder()
            is CreateOrderIntent.DismissSuccess -> _uiState.update { it.copy(createdOrder = null) }
            is CreateOrderIntent.ClearError -> _uiState.update { it.copy(errorMessage = null, validationError = null) }
        }
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingAddress = true, isLoadingRunners = true) }

            // 1. Load Address
            when (val addressResult = getCustomerAddressUseCase()) {
                is AddressResult.Success -> {
                    _uiState.update { it.copy(isLoadingAddress = false, deliveryAddress = addressResult.address) }
                }
                is AddressResult.NotFound -> {
                    _uiState.update { it.copy(isLoadingAddress = false, deliveryAddress = null) }
                }
                is AddressResult.Error -> {
                    _uiState.update { it.copy(isLoadingAddress = false, errorMessage = addressResult.message) }
                }
            }

            // 2. Load Available Runners
            val runnersResult = getAvailableRunnersUseCase()
            runnersResult.fold(
                onSuccess = { runners ->
                    _uiState.update { it.copy(isLoadingRunners = false, availableRunners = runners) }
                },
                onFailure = {
                    _uiState.update { it.copy(isLoadingRunners = false) }
                }
            )
        }
    }

    private fun addItem() {
        _uiState.update { state ->
            state.copy(items = state.items + OrderItem(itemName = "", quantity = ""))
        }
    }

    private fun removeItem(id: String) {
        _uiState.update { state ->
            if (state.items.size > 1) {
                state.copy(items = state.items.filterNot { it.id == id })
            } else {
                state
            }
        }
    }

    private fun updateItemName(id: String, name: String) {
        _uiState.update { state ->
            state.copy(
                items = state.items.map {
                    if (it.id == id) it.copy(itemName = name) else it
                },
                validationError = null
            )
        }
    }

    private fun updateItemQuantity(id: String, quantity: String) {
        _uiState.update { state ->
            state.copy(
                items = state.items.map {
                    if (it.id == id) it.copy(quantity = quantity) else it
                },
                validationError = null
            )
        }
    }

    private fun toggleItemAnyStore(id: String, anyStore: Boolean) {
        _uiState.update { state ->
            state.copy(
                items = state.items.map {
                    if (it.id == id) it.copy(anyStore = anyStore) else it
                }
            )
        }
    }

    private fun updateItemCustomStore(id: String, customStoreName: String) {
        _uiState.update { state ->
            state.copy(
                items = state.items.map {
                    if (it.id == id) it.copy(customStoreName = customStoreName) else it
                },
                validationError = null
            )
        }
    }

    private fun submitOrder() {
        val state = _uiState.value

        // Validation
        if (state.deliveryAddress == null) {
            _uiState.update { it.copy(validationError = "يرجى تحديد عنوان التوصيل أولاً قبل إرسال الطلب") }
            return
        }

        if (state.items.isEmpty()) {
            _uiState.update { it.copy(validationError = "يرجى إضافة مادة واحدة على الأقل") }
            return
        }

        for (item in state.items) {
            if (item.itemName.trim().isEmpty()) {
                _uiState.update { it.copy(validationError = "يرجى كتابة اسم المادة") }
                return
            }
            if (item.quantity.trim().isEmpty()) {
                _uiState.update { it.copy(validationError = "يرجى تحديد الكمية للمادة: ${item.itemName}") }
                return
            }
            if (!item.anyStore && (item.customStoreName == null || item.customStoreName.trim().isEmpty())) {
                _uiState.update { it.copy(validationError = "يرجى تحديد اسم المتجر للمادة: ${item.itemName} أو تفعيل خيار أي متجر") }
                return
            }
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null, validationError = null) }
            val result = createOrderUseCase(
                items = state.items,
                notes = state.notes,
                preferredRunnerId = state.selectedRunnerId,
                waitForPreferred = state.waitForPreferred,
                deliveryAddress = state.deliveryAddress
            )
            result.fold(
                onSuccess = { createdOrder ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            createdOrder = createdOrder
                        )
                    }
                    _events.emit(CreateOrderEvent.OrderCreated(createdOrder))
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            errorMessage = error.localizedMessage ?: "فشل إنشاء الطلب"
                        )
                    }
                }
            )
        }
    }
}

package com.forerun.customer.ui.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forerun.customer.domain.model.CustomerOrder
import com.forerun.customer.domain.usecase.GetCustomerOrdersUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class OrderFilter {
    ALL,
    ACTIVE,
    DELIVERED,
    CANCELLED
}

sealed interface OrdersListIntent {
    data object LoadInitial : OrdersListIntent
    data object Refresh : OrdersListIntent
    data object LoadMore : OrdersListIntent
    data class SetFilter(val filter: OrderFilter) : OrdersListIntent
    data object ClearError : OrdersListIntent
}

data class OrdersListUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isLoadingMore: Boolean = false,
    val allOrders: List<CustomerOrder> = emptyList(),
    val currentFilter: OrderFilter = OrderFilter.ALL,
    val page: Int = 1,
    val totalPages: Int = 1,
    val hasMore: Boolean = false,
    val errorMessage: String? = null
) {
    val displayedOrders: List<CustomerOrder>
        get() = when (currentFilter) {
            OrderFilter.ALL -> allOrders
            OrderFilter.ACTIVE -> allOrders.filter { it.status !in ACTIVE_EXCLUDED_STATUSES }
            OrderFilter.DELIVERED -> allOrders.filter { it.status == "DELIVERED" }
            OrderFilter.CANCELLED -> allOrders.filter { it.status == "CANCELLED" }
        }

    val activeCount: Int
        get() = allOrders.count { it.status !in ACTIVE_EXCLUDED_STATUSES }

    companion object {
        private val ACTIVE_EXCLUDED_STATUSES = setOf("DELIVERED", "CANCELLED")
    }
}

@HiltViewModel
class OrdersListViewModel @Inject constructor(
    private val getCustomerOrdersUseCase: GetCustomerOrdersUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdersListUiState())
    val uiState: StateFlow<OrdersListUiState> = _uiState.asStateFlow()

    init {
        loadOrders(page = 1, isRefresh = false)
    }

    fun onIntent(intent: OrdersListIntent) {
        when (intent) {
            is OrdersListIntent.LoadInitial -> loadOrders(page = 1, isRefresh = false)
            is OrdersListIntent.Refresh -> refresh()
            is OrdersListIntent.LoadMore -> loadMore()
            is OrdersListIntent.SetFilter -> setFilter(intent.filter)
            is OrdersListIntent.ClearError -> _uiState.update { it.copy(errorMessage = null) }
        }
    }

    private fun loadOrders(page: Int, isRefresh: Boolean) {
        viewModelScope.launch {
            if (page == 1) {
                if (isRefresh) {
                    _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
                } else {
                    _uiState.update { it.copy(isLoading = true, errorMessage = null) }
                }
            } else {
                _uiState.update { it.copy(isLoadingMore = true, errorMessage = null) }
            }

            val result = getCustomerOrdersUseCase(page = page, limit = 20, status = null)
            result.fold(
                onSuccess = { ordersPage ->
                    _uiState.update { state ->
                        val combined = if (page == 1) {
                            ordersPage.orders
                        } else {
                            state.allOrders + ordersPage.orders.filter { newOrder ->
                                state.allOrders.none { it.id == newOrder.id }
                            }
                        }
                        state.copy(
                            isLoading = false,
                            isRefreshing = false,
                            isLoadingMore = false,
                            allOrders = combined,
                            page = ordersPage.page,
                            totalPages = ordersPage.totalPages,
                            hasMore = ordersPage.page < ordersPage.totalPages,
                            errorMessage = null
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            isLoadingMore = false,
                            errorMessage = error.message ?: "حدث خطأ أثناء تحميل الطلبات"
                        )
                    }
                }
            )
        }
    }

    private fun refresh() {
        loadOrders(page = 1, isRefresh = true)
    }

    private fun loadMore() {
        val state = _uiState.value
        if (state.isLoadingMore || !state.hasMore) return
        loadOrders(page = state.page + 1, isRefresh = false)
    }

    private fun setFilter(filter: OrderFilter) {
        _uiState.update { it.copy(currentFilter = filter) }
    }
}

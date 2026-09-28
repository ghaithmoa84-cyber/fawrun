package com.forerun.customer.ui.order.create

import com.forerun.customer.data.FakeAddressRepository
import com.forerun.customer.data.FakeOrderRepository
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.repository.AddressResult
import com.forerun.customer.domain.usecase.CreateOrderUseCase
import com.forerun.customer.domain.usecase.GetAvailableRunnersUseCase
import com.forerun.customer.domain.usecase.GetCustomerAddressUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CreateOrderViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeOrderRepository: FakeOrderRepository
    private lateinit var fakeAddressRepository: FakeAddressRepository
    private lateinit var createOrderUseCase: CreateOrderUseCase
    private lateinit var getCustomerAddressUseCase: GetCustomerAddressUseCase
    private lateinit var getAvailableRunnersUseCase: GetAvailableRunnersUseCase

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeOrderRepository = FakeOrderRepository()
        fakeAddressRepository = FakeAddressRepository()
        createOrderUseCase = CreateOrderUseCase(fakeOrderRepository)
        getCustomerAddressUseCase = GetCustomerAddressUseCase(fakeAddressRepository)
        getAvailableRunnersUseCase = GetAvailableRunnersUseCase(fakeOrderRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun loadInitialData_loadsAddressAndRunners() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.Success(
            CustomerAddress(lat = 35.55, lng = 35.80, description = "بسنادا")
        )
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoadingAddress)
        assertFalse(state.isLoadingRunners)
        assertEquals("بسنادا", state.deliveryAddress?.description)
        assertEquals(1, state.availableRunners.size)
        assertEquals("الكابتن أحمد", state.availableRunners.first().name)
    }

    @Test
    fun addItem_increasesItemsCount() = runTest(testDispatcher) {
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        assertEquals(1, viewModel.uiState.value.items.size)
        viewModel.onIntent(CreateOrderIntent.AddItem)
        assertEquals(2, viewModel.uiState.value.items.size)
    }

    @Test
    fun removeItem_removesItemWhenMultipleExist() = runTest(testDispatcher) {
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        viewModel.onIntent(CreateOrderIntent.AddItem)
        val firstItemId = viewModel.uiState.value.items[0].id
        assertEquals(2, viewModel.uiState.value.items.size)

        viewModel.onIntent(CreateOrderIntent.RemoveItem(firstItemId))
        assertEquals(1, viewModel.uiState.value.items.size)
    }

    @Test
    fun removeItem_doesNotRemoveLastItem() = runTest(testDispatcher) {
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val singleItemId = viewModel.uiState.value.items[0].id
        viewModel.onIntent(CreateOrderIntent.RemoveItem(singleItemId))
        assertEquals(1, viewModel.uiState.value.items.size)
    }

    @Test
    fun updateItemFields_updatesCorrectItem() = runTest(testDispatcher) {
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val itemId = viewModel.uiState.value.items[0].id
        viewModel.onIntent(CreateOrderIntent.UpdateItemName(itemId, "سكر"))
        viewModel.onIntent(CreateOrderIntent.UpdateItemQuantity(itemId, "2 كغ"))
        viewModel.onIntent(CreateOrderIntent.ToggleItemAnyStore(itemId, false))
        viewModel.onIntent(CreateOrderIntent.UpdateItemCustomStore(itemId, "بقالية السلام"))

        val item = viewModel.uiState.value.items[0]
        assertEquals("سكر", item.itemName)
        assertEquals("2 كغ", item.quantity)
        assertFalse(item.anyStore)
        assertEquals("بقالية السلام", item.customStoreName)
    }

    @Test
    fun submitOrder_failsValidation_whenAddressMissing() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.NotFound
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val itemId = viewModel.uiState.value.items[0].id
        viewModel.onIntent(CreateOrderIntent.UpdateItemName(itemId, "سكر"))
        viewModel.onIntent(CreateOrderIntent.UpdateItemQuantity(itemId, "1 كغ"))

        viewModel.onIntent(CreateOrderIntent.SubmitOrder)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.validationError)
        assertFalse(state.isSubmitting)
        assertNull(state.createdOrder)
    }

    @Test
    fun submitOrder_failsValidation_whenItemNameEmpty() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.Success(
            CustomerAddress(lat = 35.55, lng = 35.80, description = "بسنادا")
        )
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val itemId = viewModel.uiState.value.items[0].id
        viewModel.onIntent(CreateOrderIntent.UpdateItemQuantity(itemId, "1 كغ"))

        viewModel.onIntent(CreateOrderIntent.SubmitOrder)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.validationError)
        assertFalse(state.isSubmitting)
    }

    @Test
    fun submitOrder_failsValidation_whenItemQuantityEmpty() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.Success(
            CustomerAddress(lat = 35.55, lng = 35.80, description = "بسنادا")
        )
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val itemId = viewModel.uiState.value.items[0].id
        viewModel.onIntent(CreateOrderIntent.UpdateItemName(itemId, "حليب"))

        viewModel.onIntent(CreateOrderIntent.SubmitOrder)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.validationError)
        assertFalse(state.isSubmitting)
    }

    @Test
    fun submitOrder_failsValidation_whenCustomStoreEmptyAndNotAnyStore() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.Success(
            CustomerAddress(lat = 35.55, lng = 35.80, description = "بسنادا")
        )
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val itemId = viewModel.uiState.value.items[0].id
        viewModel.onIntent(CreateOrderIntent.UpdateItemName(itemId, "حليب"))
        viewModel.onIntent(CreateOrderIntent.UpdateItemQuantity(itemId, "1 علبة"))
        viewModel.onIntent(CreateOrderIntent.ToggleItemAnyStore(itemId, false))
        viewModel.onIntent(CreateOrderIntent.UpdateItemCustomStore(itemId, "  "))

        viewModel.onIntent(CreateOrderIntent.SubmitOrder)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.validationError)
        assertFalse(state.isSubmitting)
    }

    @Test
    fun submitOrder_succeeds_whenInputIsValid() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.Success(
            CustomerAddress(lat = 35.55, lng = 35.80, description = "بسنادا")
        )
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val itemId = viewModel.uiState.value.items[0].id
        viewModel.onIntent(CreateOrderIntent.UpdateItemName(itemId, "سكر"))
        viewModel.onIntent(CreateOrderIntent.UpdateItemQuantity(itemId, "2 كغ"))
        viewModel.onIntent(CreateOrderIntent.UpdateNotes("يرجى التأكد من نظافة الكيس"))

        viewModel.onIntent(CreateOrderIntent.SubmitOrder)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isSubmitting)
        assertNotNull(state.createdOrder)
        assertEquals("ORD-001", state.createdOrder?.orderNumber)
    }

    @Test
    fun submitOrder_setsError_whenUseCaseFails() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.Success(
            CustomerAddress(lat = 35.55, lng = 35.80, description = "بسنادا")
        )
        fakeOrderRepository.createOrderResult = Result.failure(Exception("خطأ في الاتصال بالخادم"))
        val viewModel = CreateOrderViewModel(createOrderUseCase, getCustomerAddressUseCase, getAvailableRunnersUseCase)
        advanceUntilIdle()

        val itemId = viewModel.uiState.value.items[0].id
        viewModel.onIntent(CreateOrderIntent.UpdateItemName(itemId, "سكر"))
        viewModel.onIntent(CreateOrderIntent.UpdateItemQuantity(itemId, "2 كغ"))

        viewModel.onIntent(CreateOrderIntent.SubmitOrder)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isSubmitting)
        assertNull(state.createdOrder)
        assertEquals("خطأ في الاتصال بالخادم", state.errorMessage)
    }
}

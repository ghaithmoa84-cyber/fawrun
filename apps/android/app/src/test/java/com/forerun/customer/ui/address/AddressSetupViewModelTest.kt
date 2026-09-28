package com.forerun.customer.ui.address

import com.forerun.customer.data.FakeAddressRepository
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.repository.AddressResult
import com.forerun.customer.domain.usecase.GetCustomerAddressUseCase
import com.forerun.customer.domain.usecase.UpdateCustomerAddressUseCase
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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AddressSetupViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeAddressRepository: FakeAddressRepository
    private lateinit var getCustomerAddressUseCase: GetCustomerAddressUseCase
    private lateinit var updateCustomerAddressUseCase: UpdateCustomerAddressUseCase

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeAddressRepository = FakeAddressRepository()
        getCustomerAddressUseCase = GetCustomerAddressUseCase(fakeAddressRepository)
        updateCustomerAddressUseCase = UpdateCustomerAddressUseCase(fakeAddressRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun loadAddress_setsEditModeTrue_whenAddressExists() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.Success(
            CustomerAddress(lat = 35.55, lng = 35.80, description = "اللاذقية - القنجرة")
        )
        val viewModel = AddressSetupViewModel(getCustomerAddressUseCase, updateCustomerAddressUseCase)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertTrue(state.isEditMode)
        assertEquals(35.55, state.lat, 0.001)
        assertEquals(35.80, state.lng, 0.001)
        assertEquals("اللاذقية - القنجرة", state.description)
    }

    @Test
    fun loadAddress_setsEditModeFalse_whenAddressNotFound() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.NotFound
        val viewModel = AddressSetupViewModel(getCustomerAddressUseCase, updateCustomerAddressUseCase)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertFalse(state.isEditMode)
        assertEquals("", state.description)
    }

    @Test
    fun updateCoordinates_updatesLatAndLng() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.NotFound
        val viewModel = AddressSetupViewModel(getCustomerAddressUseCase, updateCustomerAddressUseCase)
        advanceUntilIdle()

        viewModel.onIntent(AddressSetupIntent.UpdateCoordinates(35.60, 35.85))

        val state = viewModel.uiState.value
        assertEquals(35.60, state.lat, 0.001)
        assertEquals(35.85, state.lng, 0.001)
    }

    @Test
    fun updateDescription_updatesDescription() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.NotFound
        val viewModel = AddressSetupViewModel(getCustomerAddressUseCase, updateCustomerAddressUseCase)
        advanceUntilIdle()

        viewModel.onIntent(AddressSetupIntent.UpdateDescription("شارع الكورنيش"))

        val state = viewModel.uiState.value
        assertEquals("شارع الكورنيش", state.description)
    }

    @Test
    fun saveAddress_failsValidation_whenDescriptionIsBlank() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.NotFound
        val viewModel = AddressSetupViewModel(getCustomerAddressUseCase, updateCustomerAddressUseCase)
        advanceUntilIdle()

        viewModel.onIntent(AddressSetupIntent.UpdateDescription("   "))
        viewModel.onIntent(AddressSetupIntent.SaveAddress)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.descriptionError)
        assertFalse(state.isSaving)
    }

    @Test
    fun saveAddress_succeeds_whenInputIsValid() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.NotFound
        fakeAddressRepository.updateAddressResult = Result.success(
            CustomerAddress(lat = 35.55, lng = 35.80, description = "العنوان المحفوظ")
        )
        val viewModel = AddressSetupViewModel(getCustomerAddressUseCase, updateCustomerAddressUseCase)
        advanceUntilIdle()

        viewModel.onIntent(AddressSetupIntent.UpdateDescription("العنوان المحفوظ"))
        viewModel.onIntent(AddressSetupIntent.SaveAddress)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isSaving)
        assertTrue(state.saveSuccess)
        assertTrue(state.isEditMode)
    }

    @Test
    fun saveAddress_setsErrorMessage_whenRepositoryFails() = runTest(testDispatcher) {
        fakeAddressRepository.getAddressResult = AddressResult.NotFound
        fakeAddressRepository.updateAddressResult = Result.failure(Exception("خطأ في الخادم"))
        val viewModel = AddressSetupViewModel(getCustomerAddressUseCase, updateCustomerAddressUseCase)
        advanceUntilIdle()

        viewModel.onIntent(AddressSetupIntent.UpdateDescription("العنوان"))
        viewModel.onIntent(AddressSetupIntent.SaveAddress)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isSaving)
        assertEquals("خطأ في الخادم", state.errorMessage)
    }
}

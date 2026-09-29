package com.forerun.customer.ui.home

import com.forerun.customer.data.FakeAuthRepository
import com.forerun.customer.data.FakeHomeRepository
import com.forerun.customer.domain.model.ActiveOrder
import com.forerun.customer.domain.model.CustomerProfile
import com.forerun.customer.domain.model.HomeData
import com.forerun.customer.domain.usecase.GetHomeDataUseCase
import com.forerun.customer.domain.usecase.LogoutUseCase
import com.forerun.customer.util.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var fakeHomeRepository: FakeHomeRepository
    private lateinit var fakeAuthRepository: FakeAuthRepository
    private lateinit var getHomeDataUseCase: GetHomeDataUseCase
    private lateinit var logoutUseCase: LogoutUseCase
    private lateinit var viewModel: HomeViewModel

    @Before
    fun setup() {
        fakeHomeRepository = FakeHomeRepository()
        fakeAuthRepository = FakeAuthRepository()
        getHomeDataUseCase = GetHomeDataUseCase(fakeHomeRepository)
        logoutUseCase = LogoutUseCase(fakeAuthRepository)
    }

    @Test
    fun loadHomeData_success_without_active_orders() = runTest {
        fakeHomeRepository.homeDataResult = Result.success(
            HomeData(
                profile = CustomerProfile(
                    id = "c1",
                    name = "عمر",
                    whatsapp = "0988888888",
                    altPhone = null,
                    status = "VERIFIED",
                    completedOrders = 12,
                    totalFeesPaid = 60000
                ),
                activeOrder = null
            )
        )

        viewModel = HomeViewModel(getHomeDataUseCase, logoutUseCase)

        val state = viewModel.uiState.value
        assertTrue("State should be Success", state is HomeUiState.Success)
        val success = state as HomeUiState.Success
        assertEquals("عمر", success.profile.name)
        assertEquals(12, success.profile.completedOrders)
        assertNull(success.activeOrder)
    }

    @Test
    fun loadHomeData_success_with_active_order() = runTest {
        val testOrder = ActiveOrder(
            id = "o1",
            orderNumber = "FAW-1001",
            status = "OUT_FOR_DELIVERY",
            totalFee = 4500,
            itemCount = 3,
            createdAt = "2026-09-28T10:00:00Z",
            runnerName = "أبو حيدر",
            runnerWhatsapp = "0999000002"
        )

        fakeHomeRepository.homeDataResult = Result.success(
            HomeData(
                profile = CustomerProfile(
                    id = "c1",
                    name = "عمر",
                    whatsapp = "0988888888",
                    altPhone = null,
                    status = "VERIFIED",
                    completedOrders = 5,
                    totalFeesPaid = 20000
                ),
                activeOrder = testOrder
            )
        )

        viewModel = HomeViewModel(getHomeDataUseCase, logoutUseCase)

        val state = viewModel.uiState.value
        assertTrue("State should be Success", state is HomeUiState.Success)
        val success = state as HomeUiState.Success
        assertEquals("عمر", success.profile.name)
        assertEquals("FAW-1001", success.activeOrder?.orderNumber)
        assertEquals("أبو حيدر", success.activeOrder?.runnerName)
        assertEquals(4500, success.activeOrder?.totalFee)
    }

    @Test
    fun loadHomeData_network_error_sets_error_state() = runTest {
        fakeHomeRepository.homeDataResult = Result.failure(
            Exception("تعذر الاتصال بالخادم")
        )

        viewModel = HomeViewModel(getHomeDataUseCase, logoutUseCase)

        val state = viewModel.uiState.value
        assertTrue("State should be Error", state is HomeUiState.Error)
        val error = state as HomeUiState.Error
        assertEquals("تعذر الاتصال بالخادم", error.message)
    }

    @Test
    fun onIntent_refresh_updates_home_data() = runTest {
        val initialProfile = CustomerProfile(
            id = "c1",
            name = "عمر",
            whatsapp = "0988888888",
            altPhone = null,
            status = "VERIFIED",
            completedOrders = 0,
            totalFeesPaid = 0
        )
        fakeHomeRepository.homeDataResult = Result.success(
            HomeData(profile = initialProfile, activeOrder = null)
        )

        viewModel = HomeViewModel(getHomeDataUseCase, logoutUseCase)
        assertEquals(0, (viewModel.uiState.value as HomeUiState.Success).profile.completedOrders)

        val updatedProfile = initialProfile.copy(completedOrders = 1)
        fakeHomeRepository.homeDataResult = Result.success(
            HomeData(profile = updatedProfile, activeOrder = null)
        )

        viewModel.onIntent(HomeIntent.Refresh)

        val refreshedState = viewModel.uiState.value
        assertTrue(refreshedState is HomeUiState.Success)
        val success = refreshedState as HomeUiState.Success
        assertEquals(1, success.profile.completedOrders)
        assertEquals(false, success.isRefreshing)
    }

    @Test
    fun loadHomeData_withActiveOrder_includesRunnerPhoneAndDetails() = runTest {
        val testOrder = ActiveOrder(
            id = "o2",
            orderNumber = "FAW-2002",
            status = "IN_PROGRESS",
            totalFee = 6000,
            itemCount = 2,
            createdAt = "2026-09-29T11:00:00Z",
            runnerName = "الكابتن باسل",
            runnerWhatsapp = "0981571936",
            runnerPhone = "0981571936"
        )

        fakeHomeRepository.homeDataResult = Result.success(
            HomeData(
                profile = CustomerProfile(
                    id = "c1",
                    name = "علي",
                    whatsapp = "0988888888",
                    altPhone = null,
                    status = "VERIFIED",
                    completedOrders = 3,
                    totalFeesPaid = 12000
                ),
                activeOrder = testOrder
            )
        )

        viewModel = HomeViewModel(getHomeDataUseCase, logoutUseCase)

        val state = viewModel.uiState.value
        assertTrue(state is HomeUiState.Success)
        val success = state as HomeUiState.Success
        assertEquals("FAW-2002", success.activeOrder?.orderNumber)
        assertEquals("الكابتن باسل", success.activeOrder?.runnerName)
        assertEquals("0981571936", success.activeOrder?.runnerWhatsapp)
        assertEquals("0981571936", success.activeOrder?.runnerPhone)
    }

    @Test
    fun loadHomeData_withActiveOrder_nullRunnerPhone_handledGracefully() = runTest {
        val testOrder = ActiveOrder(
            id = "o3",
            orderNumber = "FAW-3003",
            status = "OUT_FOR_DELIVERY",
            totalFee = 3500,
            itemCount = 1,
            createdAt = "2026-09-29T12:00:00Z",
            runnerName = "الكابتن سمير",
            runnerWhatsapp = "0988112233",
            runnerPhone = null
        )

        fakeHomeRepository.homeDataResult = Result.success(
            HomeData(
                profile = CustomerProfile(
                    id = "c1",
                    name = "مريم",
                    whatsapp = "0988888888",
                    altPhone = null,
                    status = "VERIFIED",
                    completedOrders = 8,
                    totalFeesPaid = 35000
                ),
                activeOrder = testOrder
            )
        )

        viewModel = HomeViewModel(getHomeDataUseCase, logoutUseCase)

        val state = viewModel.uiState.value
        assertTrue(state is HomeUiState.Success)
        val success = state as HomeUiState.Success
        assertEquals("FAW-3003", success.activeOrder?.orderNumber)
        assertNull(success.activeOrder?.runnerPhone)
    }
}

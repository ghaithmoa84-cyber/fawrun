package com.forerun.customer.ui.account

import app.cash.turbine.test
import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.core.storage.FakeTokenStorage
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.LoginRequest
import com.forerun.customer.data.remote.dto.auth.LoginResponse
import com.forerun.customer.data.remote.dto.auth.LogoutRequest
import com.forerun.customer.data.remote.dto.auth.RefreshRequest
import com.forerun.customer.data.remote.dto.auth.RefreshResponse
import com.forerun.customer.data.remote.dto.auth.RegisterRequest
import com.forerun.customer.data.remote.dto.auth.RegisterResponse
import com.forerun.customer.data.remote.dto.customer.ChangePasswordRequest
import com.forerun.customer.data.remote.dto.customer.CustomerProfileDto
import com.forerun.customer.data.remote.dto.customer.UpdateProfileRequest
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.repository.AccountRepository
import com.forerun.customer.domain.repository.AddressResult
import com.forerun.customer.util.MainDispatcherRule
import com.squareup.moshi.Moshi
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AccountViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var fakeAccountRepository: FakeAccountRepository
    private lateinit var fakeTokenStorage: FakeTokenStorage
    private lateinit var fakeAuthApi: FakeAuthApi
    private lateinit var viewModel: AccountViewModel

    @Before
    fun setUp() {
        fakeAccountRepository = FakeAccountRepository()
        fakeTokenStorage = FakeTokenStorage(token = "valid_access_token")
        fakeTokenStorage.refresh = "valid_refresh_token"
        fakeAuthApi = FakeAuthApi()
        viewModel = AccountViewModel(
            accountRepository = fakeAccountRepository,
            tokenStorage = fakeTokenStorage,
            authApi = fakeAuthApi
        )
    }

    @Test
    fun init_loadsAccountData_success_populatesProfileAndAddress() {
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertNotNull(state.profile)
        assertEquals("محمد علي", state.profile?.name)
        assertEquals(7, state.profile?.completedOrders)
        assertNotNull(state.address)
        assertEquals("القنجرة - جانب البلدية", state.address?.description)
        assertNull(state.errorMessage)
    }

    @Test
    fun init_loadsAccountData_failure_setsErrorMessage() {
        fakeAccountRepository.shouldFailGetProfile = true
        val errorVm = AccountViewModel(
            accountRepository = fakeAccountRepository,
            tokenStorage = fakeTokenStorage,
            authApi = fakeAuthApi
        )

        val state = errorVm.uiState.value
        assertFalse(state.isLoading)
        assertNull(state.profile)
        assertEquals("فشل الاتصال بالخادم", state.errorMessage)
    }

    @Test
    fun updateProfile_validData_callsRepositoryAndSetsSuccess() {
        viewModel.updateProfile(name = "أحمد خالد", altPhone = "0987654321")

        val state = viewModel.uiState.value
        assertFalse(state.isSavingProfile)
        assertEquals("أحمد خالد", state.profile?.name)
        assertEquals("أحمد خالد", fakeAccountRepository.lastUpdatedName)
        assertEquals("0987654321", fakeAccountRepository.lastUpdatedAltPhone)
        assertEquals("تم حفظ معلومات الحساب بنجاح", state.profileSuccessMessage)
        assertNull(state.errorMessage)
    }

    @Test
    fun saveProfile_validData_sendsOnlyNameAndAltPhone_withoutPassword() {
        viewModel.saveProfile(name = "أحمد خالد", altPhone = "0987654321")

        val state = viewModel.uiState.value
        assertFalse(state.isSavingProfile)
        val request = fakeAccountRepository.lastProfileRequest
        assertNotNull(request)
        assertEquals("أحمد خالد", request?.name)
        assertEquals("0987654321", request?.altPhone)

        val moshi = Moshi.Builder().build()
        val json = moshi.adapter(UpdateProfileRequest::class.java).toJson(request)
        assertFalse(json.contains("password"))
        assertTrue(json.contains("\"name\":\"أحمد خالد\""))
        assertTrue(json.contains("\"altPhone\":\"0987654321\""))
    }

    @Test
    fun saveProfile_nullAltPhone_sendsNullAltPhone_withoutPassword() {
        viewModel.saveProfile(name = "أحمد خالد", altPhone = null)

        val state = viewModel.uiState.value
        assertFalse(state.isSavingProfile)
        val request = fakeAccountRepository.lastProfileRequest
        assertNotNull(request)
        assertEquals("أحمد خالد", request?.name)
        assertNull(request?.altPhone)

        val moshi = Moshi.Builder().build()
        val json = moshi.adapter(UpdateProfileRequest::class.java).serializeNulls().toJson(request)
        assertFalse(json.contains("password"))
        assertTrue(json.contains("\"name\":\"أحمد خالد\""))
        assertTrue(json.contains("\"altPhone\":null"))
    }

    @Test
    fun changePassword_validPassword_sendsOnlyPassword_withoutNameOrAltPhone() {
        viewModel.changePassword(newPassword = "newPassword123", confirmPassword = "newPassword123")

        val state = viewModel.uiState.value
        assertFalse(state.isChangingPassword)
        val request = fakeAccountRepository.lastPasswordRequest
        assertNotNull(request)
        assertEquals("newPassword123", request?.password)

        val moshi = Moshi.Builder().build()
        val json = moshi.adapter(ChangePasswordRequest::class.java).toJson(request)
        assertFalse(json.contains("name"))
        assertFalse(json.contains("altPhone"))
        assertTrue(json.contains("\"password\":\"newPassword123\""))
    }

    @Test
    fun updateProfile_invalidName_setsErrorMessage_withoutCallingRepository() {
        viewModel.updateProfile(name = "A", altPhone = null)

        val state = viewModel.uiState.value
        assertNull(fakeAccountRepository.lastUpdatedName)
        assertEquals("الاسم يجب أن يكون حرفين على الأقل", state.errorMessage)
        assertNull(state.profileSuccessMessage)
    }

    @Test
    fun updateProfile_invalidAltPhone_setsErrorMessage_withoutCallingRepository() {
        viewModel.updateProfile(name = "أحمد محمد", altPhone = "12345")

        val state = viewModel.uiState.value
        assertNull(fakeAccountRepository.lastUpdatedName)
        assertEquals("الرقم البديل يجب أن يبدأ بـ 09 ويتكون من 10 أرقام", state.errorMessage)
        assertNull(state.profileSuccessMessage)
    }

    @Test
    fun updateProfile_apiFailure_setsErrorMessage() {
        fakeAccountRepository.shouldFailUpdateProfile = true

        viewModel.updateProfile(name = "أحمد خالد", altPhone = null)

        val state = viewModel.uiState.value
        assertFalse(state.isSavingProfile)
        assertEquals("خطأ في تحديث الملف", state.errorMessage)
        assertNull(state.profileSuccessMessage)
    }

    @Test
    fun changePassword_validPassword_callsRepositoryAndSetsSuccess() {
        viewModel.changePassword(newPassword = "newPassword123", confirmPassword = "newPassword123")

        val state = viewModel.uiState.value
        assertFalse(state.isChangingPassword)
        assertEquals("newPassword123", fakeAccountRepository.lastChangedPassword)
        assertEquals("تم تغيير كلمة المرور بنجاح", state.passwordSuccessMessage)
        assertNull(state.errorMessage)
    }

    @Test
    fun changePassword_mismatchedConfirm_setsErrorMessage() {
        viewModel.changePassword(newPassword = "newPassword123", confirmPassword = "differentPassword")

        val state = viewModel.uiState.value
        assertNull(fakeAccountRepository.lastChangedPassword)
        assertEquals("كلمتا المرور غير متطابقتين", state.errorMessage)
        assertNull(state.passwordSuccessMessage)
    }

    @Test
    fun changePassword_tooShortPassword_setsErrorMessage() {
        viewModel.changePassword(newPassword = "12345", confirmPassword = "12345")

        val state = viewModel.uiState.value
        assertNull(fakeAccountRepository.lastChangedPassword)
        assertEquals("كلمة المرور يجب أن تكون 8 أحرف على الأقل", state.errorMessage)
        assertNull(state.passwordSuccessMessage)
    }

    @Test
    fun changePassword_apiFailure_setsErrorMessage() {
        fakeAccountRepository.shouldFailChangePassword = true

        viewModel.changePassword(newPassword = "validPassword88", confirmPassword = "validPassword88")

        val state = viewModel.uiState.value
        assertFalse(state.isChangingPassword)
        assertEquals("خطأ في تغيير كلمة المرور", state.errorMessage)
        assertNull(state.passwordSuccessMessage)
    }

    @Test
    fun logout_callsRepositoryAndEmitsNavigateToLogin() = runTest {
        viewModel.navigateToLogin.test {
            viewModel.logout()

            assertTrue(fakeAccountRepository.logoutCalled)
            awaitItem()
        }
    }

    @Test
    fun clearMessages_clearsErrorAndSuccessBanners() {
        viewModel.updateProfile(name = "A", altPhone = null)
        assertNotNull(viewModel.uiState.value.errorMessage)

        viewModel.clearMessages()
        assertNull(viewModel.uiState.value.errorMessage)
        assertNull(viewModel.uiState.value.profileSuccessMessage)
        assertNull(viewModel.uiState.value.passwordSuccessMessage)
    }

    @Test
    fun triggerSessionExpiry_clearsAccessTokenOnly() {
        viewModel.triggerSessionExpiry()

        assertNull(fakeTokenStorage.token)
        assertEquals("valid_refresh_token", fakeTokenStorage.getRefreshToken())
        assertTrue(fakeAuthApi.logoutCalled)
        assertNotNull(viewModel.uiState.value.debugStatus)
    }

    private class FakeAccountRepository : AccountRepository {
        var profile: CustomerProfileDto = CustomerProfileDto(
            id = "cust_123",
            name = "محمد علي",
            whatsapp = "0912345678",
            altPhone = "0987654321",
            status = "VERIFIED",
            completedOrders = 7,
            totalFeesPaid = 35000,
            createdAt = "2026-09-01T10:00:00Z"
        )
        var address: CustomerAddress? = CustomerAddress(lat = 35.52, lng = 35.80, description = "القنجرة - جانب البلدية")
        var shouldFailGetProfile = false
        var shouldFailUpdateProfile = false
        var shouldFailChangePassword = false
        var lastProfileRequest: UpdateProfileRequest? = null
        var lastPasswordRequest: ChangePasswordRequest? = null
        var lastUpdatedName: String? = null
        var lastUpdatedAltPhone: String? = null
        var lastChangedPassword: String? = null
        var logoutCalled = false

        override suspend fun getProfile(): Result<CustomerProfileDto> {
            return if (shouldFailGetProfile) {
                Result.failure(Exception("فشل الاتصال بالخادم"))
            } else {
                Result.success(profile)
            }
        }

        override suspend fun updateProfile(request: UpdateProfileRequest): Result<CustomerProfileDto> {
            return if (shouldFailUpdateProfile) {
                Result.failure(Exception("خطأ في تحديث الملف"))
            } else {
                lastProfileRequest = request
                lastUpdatedName = request.name
                lastUpdatedAltPhone = request.altPhone
                profile = profile.copy(name = request.name, altPhone = request.altPhone)
                Result.success(profile)
            }
        }

        override suspend fun changePassword(request: ChangePasswordRequest): Result<CustomerProfileDto> {
            return if (shouldFailChangePassword) {
                Result.failure(Exception("خطأ في تغيير كلمة المرور"))
            } else {
                lastPasswordRequest = request
                lastChangedPassword = request.password
                Result.success(profile)
            }
        }

        override suspend fun getAddress(): AddressResult {
            return address?.let { AddressResult.Success(it) } ?: AddressResult.NotFound
        }

        override suspend fun updateAddress(lat: Double, lng: Double, description: String): Result<CustomerAddress> {
            address = CustomerAddress(lat, lng, description)
            return Result.success(address!!)
        }

        override suspend fun logout(): Result<Unit> {
            logoutCalled = true
            return Result.success(Unit)
        }
    }

    private class FakeAuthApi : AuthApi {
        var logoutCalled = false
        override suspend fun login(body: LoginRequest): ApiResponse<LoginResponse> = throw NotImplementedError()
        override suspend fun register(body: RegisterRequest): ApiResponse<RegisterResponse> = throw NotImplementedError()
        override suspend fun refresh(body: RefreshRequest): ApiResponse<RefreshResponse> = throw NotImplementedError()
        override suspend fun logout(body: LogoutRequest): ApiResponse<Unit> {
            logoutCalled = true
            return ApiResponse.Success(Unit)
        }
    }
}

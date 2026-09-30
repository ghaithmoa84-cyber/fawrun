package com.forerun.customer.data

import com.forerun.customer.domain.model.CustomerProfile
import com.forerun.customer.domain.repository.AccountRepository

class FakeAccountRepository : AccountRepository {
    var profile: CustomerProfile = CustomerProfile(
        id = "cust_123",
        name = "محمد علي",
        whatsapp = "0912345678",
        altPhone = "0987654321",
        status = "VERIFIED",
        completedOrders = 7,
        totalFeesPaid = 35000
    )

    var getProfileError: String? = null
    var updateProfileError: String? = null
    var changePasswordError: String? = null

    var lastUpdatedName: String? = null
    var lastUpdatedAltPhone: String? = null
    var lastChangedPassword: String? = null

    var getProfileCallCount = 0
    var updateProfileCallCount = 0
    var changePasswordCallCount = 0

    override suspend fun getProfile(): Result<CustomerProfile> {
        getProfileCallCount++
        val error = getProfileError
        return if (error != null) Result.failure(Exception(error)) else Result.success(profile)
    }

    override suspend fun updateProfile(name: String, altPhone: String?): Result<CustomerProfile> {
        updateProfileCallCount++
        lastUpdatedName = name
        lastUpdatedAltPhone = altPhone
        val error = updateProfileError
        if (error != null) return Result.failure(Exception(error))
        profile = profile.copy(name = name, altPhone = altPhone)
        return Result.success(profile)
    }

    override suspend fun changePassword(password: String): Result<Unit> {
        changePasswordCallCount++
        lastChangedPassword = password
        val error = changePasswordError
        return if (error != null) Result.failure(Exception(error)) else Result.success(Unit)
    }
}

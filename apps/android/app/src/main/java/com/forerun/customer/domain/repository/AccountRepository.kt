package com.forerun.customer.domain.repository

import com.forerun.customer.domain.model.CustomerProfile

interface AccountRepository {
    suspend fun getProfile(): Result<CustomerProfile>
    suspend fun updateProfile(name: String, altPhone: String?): Result<CustomerProfile>
    suspend fun changePassword(password: String): Result<Unit>
}

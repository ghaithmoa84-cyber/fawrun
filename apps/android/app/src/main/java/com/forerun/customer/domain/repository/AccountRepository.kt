package com.forerun.customer.domain.repository

import com.forerun.customer.data.remote.dto.customer.CustomerProfileDto
import com.forerun.customer.domain.model.CustomerAddress

interface AccountRepository {
    suspend fun getProfile(): Result<CustomerProfileDto>
    suspend fun updateProfile(name: String?, altPhone: String?): Result<CustomerProfileDto>
    suspend fun changePassword(password: String): Result<CustomerProfileDto>
    suspend fun getAddress(): AddressResult
    suspend fun updateAddress(lat: Double, lng: Double, description: String): Result<CustomerAddress>
    suspend fun logout(): Result<Unit>
}

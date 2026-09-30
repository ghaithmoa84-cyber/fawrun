package com.forerun.customer.data.remote.repository

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.api.CustomerApi
import com.forerun.customer.data.remote.dto.customer.ChangePasswordRequest
import com.forerun.customer.data.remote.dto.customer.CustomerProfileDto
import com.forerun.customer.data.remote.dto.customer.UpdateProfileRequest
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.repository.AccountRepository
import com.forerun.customer.domain.repository.AddressRepository
import com.forerun.customer.domain.repository.AddressResult
import com.forerun.customer.domain.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AccountRepositoryImpl @Inject constructor(
    private val customerApi: CustomerApi,
    private val addressRepository: AddressRepository,
    private val authRepository: AuthRepository
) : AccountRepository {

    override suspend fun getProfile(): Result<CustomerProfileDto> {
        return when (val response = customerApi.me()) {
            is ApiResponse.Success -> Result.success(response.data)
            is ApiResponse.Error -> Result.failure(Exception(response.message))
        }
    }

    override suspend fun updateProfile(request: UpdateProfileRequest): Result<CustomerProfileDto> {
        return when (val response = customerApi.updateProfile(request)) {
            is ApiResponse.Success -> Result.success(response.data)
            is ApiResponse.Error -> Result.failure(Exception(response.message))
        }
    }

    override suspend fun changePassword(request: ChangePasswordRequest): Result<CustomerProfileDto> {
        return when (val response = customerApi.changePassword(request)) {
            is ApiResponse.Success -> Result.success(response.data)
            is ApiResponse.Error -> Result.failure(Exception(response.message))
        }
    }

    override suspend fun getAddress(): AddressResult {
        return addressRepository.getAddress()
    }

    override suspend fun updateAddress(
        lat: Double,
        lng: Double,
        description: String
    ): Result<CustomerAddress> {
        return addressRepository.updateAddress(lat, lng, description)
    }

    override suspend fun logout(): Result<Unit> {
        return when (authRepository.logout()) {
            is ApiResponse.Success -> Result.success(Unit)
            is ApiResponse.Error -> Result.success(Unit) // Even if server fails, local is cleared
        }
    }
}

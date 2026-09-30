package com.forerun.customer.domain.repository

import com.forerun.customer.domain.model.CustomerAddress

sealed interface AddressResult {
    data class Success(val address: CustomerAddress) : AddressResult
    data object NotFound : AddressResult
    data class Error(val message: String) : AddressResult
}

interface AddressRepository {
    suspend fun getAddress(): AddressResult
    suspend fun updateAddress(lat: Double, lng: Double, description: String): Result<CustomerAddress>
}

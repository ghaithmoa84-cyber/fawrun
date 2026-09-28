package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.repository.AddressRepository
import javax.inject.Inject

class UpdateCustomerAddressUseCase @Inject constructor(
    private val repository: AddressRepository
) {
    suspend operator fun invoke(
        lat: Double,
        lng: Double,
        description: String
    ): Result<CustomerAddress> {
        return repository.updateAddress(lat = lat, lng = lng, description = description)
    }
}

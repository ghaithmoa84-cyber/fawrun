package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.repository.AddressRepository
import com.forerun.customer.domain.repository.AddressResult
import javax.inject.Inject

class GetCustomerAddressUseCase @Inject constructor(
    private val repository: AddressRepository
) {
    suspend operator fun invoke(): AddressResult {
        return repository.getAddress()
    }
}

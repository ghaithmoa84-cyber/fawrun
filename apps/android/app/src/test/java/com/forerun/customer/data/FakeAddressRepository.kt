package com.forerun.customer.data

import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.repository.AddressRepository
import com.forerun.customer.domain.repository.AddressResult

class FakeAddressRepository : AddressRepository {
    var getAddressResult: AddressResult = AddressResult.Success(
        CustomerAddress(lat = 35.5234, lng = 35.9876, description = "اللاذقية - القنجرة")
    )
    var updateAddressResult: Result<CustomerAddress> = Result.success(
        CustomerAddress(lat = 35.5234, lng = 35.9876, description = "العنوان المحفوظ")
    )

    override suspend fun getAddress(): AddressResult = getAddressResult

    override suspend fun updateAddress(
        lat: Double,
        lng: Double,
        description: String
    ): Result<CustomerAddress> = updateAddressResult
}

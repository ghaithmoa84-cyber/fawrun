package com.forerun.customer.domain.usecase.account

import com.forerun.customer.domain.model.CustomerProfile
import com.forerun.customer.domain.repository.AccountRepository
import javax.inject.Inject

class UpdateAccountProfileUseCase @Inject constructor(
    private val repository: AccountRepository
) {
    suspend operator fun invoke(name: String, altPhone: String?): Result<CustomerProfile> =
        repository.updateProfile(name = name, altPhone = altPhone)
}

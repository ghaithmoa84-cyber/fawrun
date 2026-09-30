package com.forerun.customer.domain.usecase.account

import com.forerun.customer.domain.model.CustomerProfile
import com.forerun.customer.domain.repository.AccountRepository
import javax.inject.Inject

class GetAccountProfileUseCase @Inject constructor(
    private val repository: AccountRepository
) {
    suspend operator fun invoke(): Result<CustomerProfile> = repository.getProfile()
}

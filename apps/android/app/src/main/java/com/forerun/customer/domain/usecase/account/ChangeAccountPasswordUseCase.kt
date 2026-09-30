package com.forerun.customer.domain.usecase.account

import com.forerun.customer.domain.repository.AccountRepository
import javax.inject.Inject

class ChangeAccountPasswordUseCase @Inject constructor(
    private val repository: AccountRepository
) {
    suspend operator fun invoke(password: String): Result<Unit> =
        repository.changePassword(password = password)
}

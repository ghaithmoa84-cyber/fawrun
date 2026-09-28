package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.model.RunnerInfo
import com.forerun.customer.domain.repository.OrderRepository
import javax.inject.Inject

class GetAvailableRunnersUseCase @Inject constructor(
    private val repository: OrderRepository
) {
    suspend operator fun invoke(): Result<List<RunnerInfo>> {
        return repository.getAvailableRunners()
    }
}

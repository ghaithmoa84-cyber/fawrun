package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.model.HomeData
import com.forerun.customer.domain.repository.HomeRepository
import javax.inject.Inject

class GetHomeDataUseCase @Inject constructor(
    private val repository: HomeRepository
) {
    suspend operator fun invoke(): Result<HomeData> {
        return repository.getHomeData()
    }
}

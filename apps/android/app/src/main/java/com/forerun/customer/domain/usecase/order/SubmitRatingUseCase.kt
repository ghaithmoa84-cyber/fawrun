package com.forerun.customer.domain.usecase.order

import com.forerun.customer.domain.model.RatingResult
import com.forerun.customer.domain.repository.OrderRepository
import javax.inject.Inject

class SubmitRatingUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(
        orderId: String,
        stars: Int,
        note: String?,
        isUpdate: Boolean = false
    ): Result<RatingResult> {
        return orderRepository.submitRating(
            orderId = orderId,
            stars = stars,
            note = note,
            isUpdate = isUpdate
        )
    }
}

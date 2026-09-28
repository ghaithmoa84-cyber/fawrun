package com.forerun.customer.domain.model

import java.util.UUID

data class OrderItem(
    val id: String = UUID.randomUUID().toString(),
    val itemName: String,
    val quantity: String,
    val anyStore: Boolean = true,
    val customStoreName: String? = null
)

data class CreatedOrder(
    val id: String,
    val orderNumber: String,
    val status: String,
    val totalFee: Int,
    val feeNote: String
)

data class RunnerInfo(
    val id: String,
    val name: String,
    val avgRating: Double? = null,
    val totalRatings: Int? = null,
    val status: String
)

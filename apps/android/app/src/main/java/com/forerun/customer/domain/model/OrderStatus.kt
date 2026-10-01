package com.forerun.customer.domain.model

enum class OrderStatus {
    DRAFT,
    PENDING_REVIEW,
    UNDER_REVIEW,
    AWAITING_RUNNER,
    AWAITING_PREFERRED_RUNNER,
    ASSIGNED,
    IN_PROGRESS,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED,
    UNKNOWN;

    val isTerminal: Boolean get() = this == DELIVERED || this == CANCELLED
    val isActive: Boolean get() = !isTerminal

    companion object {
        fun fromString(status: String?): OrderStatus {
            return when (status?.uppercase()) {
                "DRAFT" -> DRAFT
                "PENDING_REVIEW" -> PENDING_REVIEW
                "UNDER_REVIEW" -> UNDER_REVIEW
                "AWAITING_RUNNER" -> AWAITING_RUNNER
                "AWAITING_PREFERRED_RUNNER" -> AWAITING_PREFERRED_RUNNER
                "ASSIGNED" -> ASSIGNED
                "IN_PROGRESS" -> IN_PROGRESS
                "OUT_FOR_DELIVERY" -> OUT_FOR_DELIVERY
                "DELIVERED" -> DELIVERED
                "CANCELLED" -> CANCELLED
                else -> UNKNOWN
            }
        }
    }
}

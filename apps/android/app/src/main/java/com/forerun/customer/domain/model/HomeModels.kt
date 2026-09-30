package com.forerun.customer.domain.model

data class CustomerProfile(
    val id: String,
    val name: String,
    val whatsapp: String,
    val altPhone: String? = null,
    val status: String,
    val completedOrders: Int,
    val totalFeesPaid: Int
)

data class ActiveOrder(
    val id: String,
    val orderNumber: String,
    val status: String,
    val totalFee: Int,
    val itemCount: Int,
    val createdAt: String,
    val runnerName: String? = null,
    val runnerWhatsapp: String? = null,
    val runnerPhone: String? = null
)

data class HomeData(
    val profile: CustomerProfile,
    val activeOrder: ActiveOrder? = null
)

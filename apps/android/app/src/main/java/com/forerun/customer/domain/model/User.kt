package com.forerun.customer.domain.model

enum class UserStatus {
    PENDING_VERIFICATION,
    VERIFIED,
    REJECTED,
    SUSPENDED,
    UNKNOWN;

    companion object {
        fun fromString(status: String?): UserStatus {
            return when (status?.uppercase()) {
                "PENDING_VERIFICATION" -> PENDING_VERIFICATION
                "VERIFIED" -> VERIFIED
                "REJECTED" -> REJECTED
                "SUSPENDED" -> SUSPENDED
                else -> UNKNOWN
            }
        }
    }
}

data class User(
    val id: String,
    val name: String,
    val role: String,
    val status: UserStatus
)

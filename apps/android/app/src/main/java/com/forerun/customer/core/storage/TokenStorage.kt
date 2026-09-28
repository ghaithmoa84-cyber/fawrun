package com.forerun.customer.core.storage

interface TokenStorage {
    fun getAccessToken(): String?
    fun setAccessToken(token: String?)

    fun getRefreshToken(): String?
    fun setRefreshToken(token: String?)

    fun getTokenExpiry(): Long
    fun setTokenExpiry(expiry: Long)

    fun getUserId(): String?
    fun setUserId(id: String?)

    fun getUserName(): String?
    fun setUserName(name: String?)

    fun getUserRole(): String?
    fun setUserRole(role: String?)

    fun getUserStatus(): String?
    fun setUserStatus(status: String?)

    fun saveAuthTokens(
        accessToken: String,
        refreshToken: String,
        expiryTimestamp: Long
    )

    fun clearAll()
    fun clearAccessTokenOnly()
    fun hasValidAccessToken(): Boolean
}

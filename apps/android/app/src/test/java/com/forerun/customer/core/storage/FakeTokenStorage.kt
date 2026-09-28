package com.forerun.customer.core.storage

class FakeTokenStorage(
    var token: String? = "mock-token-xyz",
    var refresh: String? = "mock-refresh-token",
    var expiry: Long = System.currentTimeMillis() + 3600000L,
    var uid: String? = "user_123",
    var uname: String? = "أحمد محمد",
    var urole: String? = "CUSTOMER",
    var ustatus: String? = "VERIFIED"
) : TokenStorage {

    override fun getAccessToken(): String? = token
    override fun setAccessToken(token: String?) { this.token = token }

    override fun getRefreshToken(): String? = refresh
    override fun setRefreshToken(token: String?) { this.refresh = token }

    override fun getTokenExpiry(): Long = expiry
    override fun setTokenExpiry(expiry: Long) { this.expiry = expiry }

    override fun getUserId(): String? = uid
    override fun setUserId(id: String?) { this.uid = id }

    override fun getUserName(): String? = uname
    override fun setUserName(name: String?) { this.uname = name }

    override fun getUserRole(): String? = urole
    override fun setUserRole(role: String?) { this.urole = role }

    override fun getUserStatus(): String? = ustatus
    override fun setUserStatus(status: String?) { this.ustatus = status }

    override fun saveAuthTokens(accessToken: String, refreshToken: String, expiryTimestamp: Long) {
        this.token = accessToken
        this.refresh = refreshToken
        this.expiry = expiryTimestamp
    }

    override fun clearAll() {
        token = null
        refresh = null
        expiry = 0L
        uid = null
        uname = null
        urole = null
        ustatus = null
    }

    override fun clearAccessTokenOnly() {
        token = null
    }

    override fun hasValidAccessToken(): Boolean {
        return !token.isNullOrBlank() && expiry > System.currentTimeMillis()
    }
}

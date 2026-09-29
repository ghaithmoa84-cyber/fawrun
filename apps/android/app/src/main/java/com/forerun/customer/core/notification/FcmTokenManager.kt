package com.forerun.customer.core.notification

import android.util.Log
import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.core.storage.TokenStorage
import com.forerun.customer.domain.repository.DeviceTokenRepository
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FcmTokenManager @Inject constructor(
    private val deviceTokenRepository: DeviceTokenRepository,
    private val tokenStorage: TokenStorage
) {
    suspend fun registerDeviceToken(): Result<Unit> {
        return try {
            val token = try {
                FirebaseMessaging.getInstance().token.await()
            } catch (e: Exception) {
                Log.w(TAG, "Failed to get FCM token from Firebase: ${e.message}")
                tokenStorage.getDeviceToken()
            }

            if (!token.isNullOrBlank()) {
                tokenStorage.setDeviceToken(token)
                when (val result = deviceTokenRepository.registerDeviceToken(token)) {
                    is ApiResponse.Success -> Result.success(Unit)
                    is ApiResponse.Error -> Result.failure(Exception(result.message))
                }
            } else {
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error registering FCM token: ${e.message}")
            Result.failure(e)
        }
    }

    suspend fun unregisterDeviceToken(): Result<Unit> {
        return try {
            val token = tokenStorage.getDeviceToken()
            if (!token.isNullOrBlank()) {
                deviceTokenRepository.unregisterDeviceToken(token)
                try {
                    FirebaseMessaging.getInstance().deleteToken().await()
                } catch (_: Exception) {}
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering FCM token: ${e.message}")
            Result.failure(e)
        }
    }

    companion object {
        private const val TAG = "FcmTokenManager"
    }
}

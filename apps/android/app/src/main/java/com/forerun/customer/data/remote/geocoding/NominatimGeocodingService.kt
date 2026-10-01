package com.forerun.customer.data.remote.geocoding

import android.util.Log
import com.forerun.customer.core.di.GeocodingHttpClient
import com.forerun.customer.domain.service.GeocodingService
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import javax.inject.Inject
import javax.inject.Singleton

@JsonClass(generateAdapter = true)
data class NominatimResponse(
    @Json(name = "display_name") val displayName: String? = null,
    @Json(name = "name") val name: String? = null,
    @Json(name = "address") val address: NominatimAddress? = null
)

@JsonClass(generateAdapter = true)
data class NominatimAddress(
    @Json(name = "road") val road: String? = null,
    @Json(name = "neighbourhood") val neighbourhood: String? = null,
    @Json(name = "suburb") val suburb: String? = null,
    @Json(name = "village") val village: String? = null,
    @Json(name = "town") val town: String? = null,
    @Json(name = "city") val city: String? = null
)

@Singleton
class NominatimGeocodingService @Inject constructor(
    private val moshi: Moshi,
    private val cache: AddressReverseGeocodeCache,
    @GeocodingHttpClient private val httpClient: OkHttpClient
) : GeocodingService {

    private val adapter by lazy {
        moshi.adapter(NominatimResponse::class.java)
    }

    override suspend fun reverseGeocode(lat: Double, lng: Double): String? = withContext(Dispatchers.IO) {
        // Check LRU Cache first
        val cached = cache.get(lat, lng)
        if (cached != null) {
            return@withContext cached
        }

        try {
            val url = "https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lng&format=json&accept-language=ar"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Forerun/1.0 (android)")
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    if (response.code == 429) {
                        Log.w("Nominatim", "Nominatim rate limited (429 Too Many Requests)")
                    } else {
                        Log.w("Nominatim", "Response unsuccessful: ${response.code}")
                    }
                    return@withContext null
                }
                val body = response.body?.string() ?: return@withContext null
                val parsed = adapter.fromJson(body) ?: return@withContext null
                val formatted = formatNominatimResult(parsed)
                if (!formatted.isNullOrBlank()) {
                    cache.put(lat, lng, formatted)
                }
                formatted
            }
        } catch (e: Exception) {
            Log.w("Nominatim", "Reverse geocode error: ${e.message}")
            null
        }
    }

    private fun formatNominatimResult(result: NominatimResponse): String? {
        val addr = result.address
        val localPart = when {
            !addr?.road.isNullOrBlank() && !addr?.village.isNullOrBlank() -> "${addr.village} - ${addr.road}"
            !addr?.road.isNullOrBlank() && !addr?.suburb.isNullOrBlank() -> "${addr.suburb} - ${addr.road}"
            !addr?.village.isNullOrBlank() -> addr.village
            !addr?.town.isNullOrBlank() -> addr.town
            !addr?.suburb.isNullOrBlank() -> addr.suburb
            !result.name.isNullOrBlank() -> result.name
            else -> null
        }

        if (!localPart.isNullOrBlank()) {
            return localPart
        }

        return result.displayName?.split(",")?.take(2)?.joinToString(" - ") { it.trim() }
    }
}

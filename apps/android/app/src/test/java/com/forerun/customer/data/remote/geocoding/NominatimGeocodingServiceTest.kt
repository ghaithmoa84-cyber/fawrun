package com.forerun.customer.data.remote.geocoding

import com.squareup.moshi.Moshi
import kotlinx.coroutines.test.runTest
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NominatimGeocodingServiceTest {

    private val moshi = Moshi.Builder().build()

    @Test
    fun reverseGeocode_returns_cached_value_without_http_call() = runTest {
        var callCount = 0
        val fakeClient = OkHttpClient.Builder()
            .addInterceptor(Interceptor { chain ->
                callCount++
                chain.proceed(chain.request())
            })
            .build()
        val cache = AddressReverseGeocodeCache()
        cache.put(35.55, 35.80, "اللاذقية - القنجرة")

        val service = NominatimGeocodingService(moshi, cache, fakeClient)
        val result = service.reverseGeocode(35.55, 35.80)

        assertEquals("اللاذقية - القنجرة", result)
        assertEquals(0, callCount)
    }

    @Test
    fun reverseGeocode_fetches_from_network_and_caches_result() = runTest {
        val json = """
            {
                "display_name": "شارع البلدية, القنجرة, اللاذقية",
                "name": "شارع البلدية",
                "address": {
                    "road": "شارع البلدية",
                    "village": "القنجرة"
                }
            }
        """.trimIndent()

        val fakeClient = OkHttpClient.Builder()
            .addInterceptor(Interceptor { chain ->
                Response.Builder()
                    .request(chain.request())
                    .protocol(Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body(json.toResponseBody("application/json".toMediaType()))
                    .build()
            })
            .build()

        val cache = AddressReverseGeocodeCache()
        val service = NominatimGeocodingService(moshi, cache, fakeClient)

        val result = service.reverseGeocode(35.5534, 35.8000)

        assertEquals("القنجرة - شارع البلدية", result)
        assertEquals("القنجرة - شارع البلدية", cache.get(35.5534, 35.8000))
    }

    @Test
    fun reverseGeocode_returns_null_on_http_error() = runTest {
        val fakeClient = OkHttpClient.Builder()
            .addInterceptor(Interceptor { chain ->
                Response.Builder()
                    .request(chain.request())
                    .protocol(Protocol.HTTP_1_1)
                    .code(429)
                    .message("Too Many Requests")
                    .body("Rate limit exceeded".toResponseBody("text/plain".toMediaType()))
                    .build()
            })
            .build()

        val cache = AddressReverseGeocodeCache()
        val service = NominatimGeocodingService(moshi, cache, fakeClient)

        val result = service.reverseGeocode(35.55, 35.80)

        assertNull(result)
    }
}

package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.service.GeocodingService
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReverseGeocodeUseCaseTest {

    private class FakeGeocodingService : GeocodingService {
        var result: String? = "دمشق - الميدان"
        var lastLat: Double? = null
        var lastLng: Double? = null

        override suspend fun reverseGeocode(lat: Double, lng: Double): String? {
            lastLat = lat
            lastLng = lng
            return result
        }
    }

    @Test
    fun invoke_delegates_to_geocodingService() = runTest {
        val service = FakeGeocodingService()
        val useCase = ReverseGeocodeUseCase(service)

        val result = useCase(33.5138, 36.2765)

        assertEquals("دمشق - الميدان", result)
        assertEquals(33.5138, service.lastLat)
        assertEquals(36.2765, service.lastLng)
    }

    @Test
    fun invoke_returns_null_when_service_fails() = runTest {
        val service = FakeGeocodingService().apply { result = null }
        val useCase = ReverseGeocodeUseCase(service)

        val result = useCase(0.0, 0.0)

        assertNull(result)
    }
}

package com.forerun.customer.domain.usecase

import com.forerun.customer.domain.service.GeocodingService
import javax.inject.Inject

class ReverseGeocodeUseCase @Inject constructor(
    private val geocodingService: GeocodingService
) {
    suspend operator fun invoke(lat: Double, lng: Double): String? {
        return geocodingService.reverseGeocode(lat, lng)
    }
}

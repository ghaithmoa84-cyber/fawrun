package com.forerun.customer.domain.service

interface GeocodingService {
    suspend fun reverseGeocode(lat: Double, lng: Double): String?
}

package com.forerun.customer.data.remote.geocoding

import java.util.Collections
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AddressReverseGeocodeCache @Inject constructor() {

    var maxSize: Int = DEFAULT_MAX_SIZE
        private set

    constructor(maxSize: Int) : this() {
        this.maxSize = maxSize
    }

    private val cache: MutableMap<String, String> = Collections.synchronizedMap(
        object : LinkedHashMap<String, String>(16, 0.75f, true) {
            override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, String>?): Boolean {
                return size > maxSize
            }
        }
    )

    fun get(lat: Double, lng: Double): String? {
        val key = toKey(lat, lng)
        return cache[key]
    }

    fun put(lat: Double, lng: Double, address: String) {
        val key = toKey(lat, lng)
        cache[key] = address
    }

    fun contains(lat: Double, lng: Double): Boolean {
        val key = toKey(lat, lng)
        return cache.containsKey(key)
    }

    fun size(): Int = cache.size

    fun clear() {
        cache.clear()
    }

    companion object {
        const val DEFAULT_MAX_SIZE = 50

        // Round to 4 decimal places (~11 meters) to group nearby map moves
        fun toKey(lat: Double, lng: Double): String {
            val roundedLat = String.format(Locale.US, "%.4f", lat)
            val roundedLng = String.format(Locale.US, "%.4f", lng)
            return "$roundedLat,$roundedLng"
        }
    }
}

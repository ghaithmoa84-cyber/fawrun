package com.forerun.customer.data.remote.geocoding

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AddressReverseGeocodeCacheTest {

    @Test
    fun putAndGet_returnsCachedAddress() {
        val cache = AddressReverseGeocodeCache(maxSize = 10)
        cache.put(35.5512, 35.8012, "القنجرة - جانب البلدية")

        val result = cache.get(35.5512, 35.8012)
        assertEquals("القنجرة - جانب البلدية", result)
    }

    @Test
    fun get_nonExistentKey_returnsNull() {
        val cache = AddressReverseGeocodeCache(maxSize = 10)
        assertNull(cache.get(35.0000, 35.0000))
    }

    @Test
    fun quantizedCoordinates_nearbyMicroMovementsShareCacheKey() {
        val cache = AddressReverseGeocodeCache(maxSize = 10)
        // 35.55121 and 35.55124 round to 35.5512 (~3 meters difference)
        cache.put(35.55121, 35.80121, "حي الروضة")

        val result = cache.get(35.55124, 35.80123)
        assertEquals("حي الروضة", result)
    }

    @Test
    fun distinctCoordinates_doNotCollide() {
        val cache = AddressReverseGeocodeCache(maxSize = 10)
        cache.put(35.5500, 35.8000, "الموقع الأول")
        cache.put(35.5600, 35.8100, "الموقع الثاني")

        assertEquals("الموقع الأول", cache.get(35.5500, 35.8000))
        assertEquals("الموقع الثاني", cache.get(35.5600, 35.8100))
        assertEquals(2, cache.size())
    }

    @Test
    fun lruEviction_whenMaxSizeExceeded_evictsLeastRecentlyUsed() {
        val cache = AddressReverseGeocodeCache(maxSize = 3)
        cache.put(35.1000, 35.1000, "العنوان 1")
        cache.put(35.2000, 35.2000, "العنوان 2")
        cache.put(35.3000, 35.3000, "العنوان 3")

        // Exceed capacity: insert 4th entry
        cache.put(35.4000, 35.4000, "العنوان 4")

        assertEquals(3, cache.size())
        // Entry 1 was least recently used, so it must be evicted
        assertNull(cache.get(35.1000, 35.1000))
        assertNotNull(cache.get(35.2000, 35.2000))
        assertNotNull(cache.get(35.3000, 35.3000))
        assertNotNull(cache.get(35.4000, 35.4000))
    }

    @Test
    fun lruAccessOrder_recentlyAccessedItemIsPreserved() {
        val cache = AddressReverseGeocodeCache(maxSize = 3)
        cache.put(35.1000, 35.1000, "العنوان 1")
        cache.put(35.2000, 35.2000, "العنوان 2")
        cache.put(35.3000, 35.3000, "العنوان 3")

        // Access entry 1 so it becomes the most recently used
        val read = cache.get(35.1000, 35.1000)
        assertEquals("العنوان 1", read)

        // Insert entry 4 -> entry 2 should be evicted now because entry 1 was accessed!
        cache.put(35.4000, 35.4000, "العنوان 4")

        assertNotNull(cache.get(35.1000, 35.1000))
        assertNull(cache.get(35.2000, 35.2000))
        assertNotNull(cache.get(35.3000, 35.3000))
        assertNotNull(cache.get(35.4000, 35.4000))
    }

    @Test
    fun clear_removesAllEntries() {
        val cache = AddressReverseGeocodeCache(maxSize = 10)
        cache.put(35.5500, 35.8000, "مكان ما")
        assertEquals(1, cache.size())

        cache.clear()
        assertEquals(0, cache.size())
        assertNull(cache.get(35.5500, 35.8000))
    }

    @Test
    fun contains_checksEntryExistence() {
        val cache = AddressReverseGeocodeCache(maxSize = 10)
        assertFalse(cache.contains(35.5500, 35.8000))

        cache.put(35.5500, 35.8000, "موجود")
        assertTrue(cache.contains(35.5500, 35.8000))
    }
}

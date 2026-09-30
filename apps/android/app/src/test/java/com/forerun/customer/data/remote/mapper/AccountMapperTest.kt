package com.forerun.customer.data.remote.mapper

import com.forerun.customer.data.remote.dto.customer.CustomerProfileDto
import com.forerun.customer.data.remote.mapper.AccountMapper.toDomain
import com.squareup.moshi.Moshi
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant

class AccountMapperTest {

    private fun dto(createdAt: String) = CustomerProfileDto(
        id = "cust_123",
        name = "محمد علي",
        whatsapp = "0912345678",
        altPhone = "0987654321",
        status = "VERIFIED",
        completedOrders = 7,
        totalFeesPaid = 35000,
        createdAt = createdAt
    )

    @Test
    fun toDomain_mapsEveryField() {
        val profile = dto("2026-09-01T10:00:00Z").toDomain()

        assertEquals("cust_123", profile.id)
        assertEquals("محمد علي", profile.name)
        assertEquals("0912345678", profile.whatsapp)
        assertEquals("0987654321", profile.altPhone)
        assertEquals("VERIFIED", profile.status)
        assertEquals(7, profile.completedOrders)
        assertEquals(35000, profile.totalFeesPaid)
        assertEquals(Instant.parse("2026-09-01T10:00:00Z"), profile.createdAt)
    }

    @Test
    fun toDomain_keepsNullAltPhone() {
        val profile = dto("2026-09-01T10:00:00Z").copy(altPhone = null).toDomain()

        assertNull(profile.altPhone)
    }

    @Test
    fun toDomain_parsesUtcZuluTimestamp() {
        val profile = dto("2026-09-01T10:00:00Z").toDomain()

        assertEquals(Instant.parse("2026-09-01T10:00:00Z"), profile.createdAt)
    }

    @Test
    fun toDomain_parsesFractionalSecondsTimestamp() {
        val profile = dto("2026-09-01T10:00:00.123Z").toDomain()

        assertEquals(Instant.parse("2026-09-01T10:00:00.123Z"), profile.createdAt)
    }

    @Test
    fun toDomain_parsesOffsetTimestamp() {
        val profile = dto("2026-09-01T10:00:00+03:00").toDomain()

        assertEquals(Instant.parse("2026-09-01T07:00:00Z"), profile.createdAt)
    }

    @Test
    fun toDomain_blankTimestamp_becomesNull() {
        val profile = dto("").toDomain()

        assertNull(profile.createdAt)
    }

    @Test
    fun toDomain_malformedTimestamp_becomesNull() {
        val profile = dto("not-a-timestamp").toDomain()

        assertNull(profile.createdAt)
    }

    @Test
    fun dto_isDeserializableByMoshi_andKeepsCreatedAtShape() {
        val moshi = Moshi.Builder().build()
        val json = """
            {
              "id": "cust_123",
              "name": "محمد علي",
              "whatsapp": "0912345678",
              "altPhone": null,
              "status": "VERIFIED",
              "completedOrders": 7,
              "totalFeesPaid": 35000,
              "createdAt": "2026-09-01T10:00:00Z"
            }
        """.trimIndent()

        val parsed = moshi.adapter(CustomerProfileDto::class.java).fromJson(json)

        assertNotNull(parsed)
        assertEquals("cust_123", parsed!!.id)
        assertNull(parsed.altPhone)
        assertEquals("2026-09-01T10:00:00Z", parsed.createdAt)
    }
}

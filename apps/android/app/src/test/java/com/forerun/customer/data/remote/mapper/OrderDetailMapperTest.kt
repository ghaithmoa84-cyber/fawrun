package com.forerun.customer.data.remote.mapper

import com.forerun.customer.data.remote.dto.order.DetailOrderItemDto
import com.forerun.customer.data.remote.dto.order.OrderDetailResponseDto
import com.forerun.customer.data.remote.dto.order.OrderRatingDto
import com.forerun.customer.data.remote.dto.order.OrderRunnerDetailDto
import com.forerun.customer.data.remote.dto.order.OrderStoreDetailDto
import com.forerun.customer.data.remote.dto.order.OrderTimelineDto
import com.forerun.customer.data.remote.dto.order.StoreItemDetailDto
import com.forerun.customer.data.remote.dto.order.StoreReceiptDetailDto
import com.forerun.customer.data.remote.mapper.OrderDetailMapper.toDomain
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderDetailMapperTest {

    private fun sampleDto(
        stores: List<OrderStoreDetailDto> = emptyList(),
        orderStores: List<OrderStoreDetailDto>? = null,
        rating: OrderRatingDto? = null,
        timeline: OrderTimelineDto? = null,
        runner: OrderRunnerDetailDto? = null
    ) = OrderDetailResponseDto(
        id = "ord_100",
        orderNumber = "ORD-2026-001",
        status = "ASSIGNED",
        isPeripheral = true,
        baseFee = 5000,
        peripheralFee = 2000,
        extraStoresFee = 1500,
        totalFee = 8500,
        deliveryLat = 33.5138,
        deliveryLng = 36.2765,
        deliveryDesc = "بجانب الحديقة العامة",
        notes = "يرجى الاتصال عند الوصول",
        preferredRunnerId = "run_999",
        waitForPreferred = true,
        createdAt = "2026-10-01T10:00:00Z",
        updatedAt = "2026-10-01T10:05:00Z",
        deliveredAt = "2026-10-01T10:30:00Z",
        cancelledAt = null,
        cancelReason = null,
        items = listOf(
            DetailOrderItemDto(
                id = "item_1",
                itemName = "حليب",
                quantity = "2",
                customStoreName = "بقالية الشام",
                anyStore = false
            ),
            DetailOrderItemDto(
                id = "item_2",
                itemName = "خبز",
                quantity = "1 ربطة",
                customStoreName = null,
                anyStore = true
            )
        ),
        stores = stores,
        orderStores = orderStores,
        rating = rating,
        timeline = timeline,
        runner = runner
    )

    @Test
    fun toDomain_mapsAllFieldsCorrectly() {
        val storeDto = OrderStoreDetailDto(
            id = "store_1",
            storeName = "بقالية النور",
            status = "COMPLETED",
            isExtra = true,
            items = listOf(
                StoreItemDetailDto(id = "si_1", itemName = "حليب", quantity = "2")
            ),
            receipts = listOf(
                StoreReceiptDetailDto(id = "rec_1", imageUrl = "https://example.com/receipt.jpg")
            )
        )
        val ratingDto = OrderRatingDto(stars = 5, note = "خدمة ممتازة وسريعة")
        val timelineDto = OrderTimelineDto(
            createdAt = "2026-10-01T10:00:00Z",
            reviewedAt = "2026-10-01T10:02:00Z",
            assignedAt = "2026-10-01T10:05:00Z",
            startedAt = "2026-10-01T10:10:00Z",
            deliveredAt = "2026-10-01T10:30:00Z",
            cancelledAt = null
        )
        val runnerDto = OrderRunnerDetailDto(
            id = "run_1",
            name = "سامر الأحمد",
            avgRating = 4.9,
            totalRatings = 45,
            status = "BUSY",
            whatsapp = "+963911223344",
            phone = "011223344"
        )

        val dto = sampleDto(
            stores = listOf(storeDto),
            rating = ratingDto,
            timeline = timelineDto,
            runner = runnerDto
        )

        val domain = dto.toDomain()

        assertEquals("ord_100", domain.id)
        assertEquals("ORD-2026-001", domain.orderNumber)
        assertEquals("ASSIGNED", domain.status)
        assertTrue(domain.isPeripheral)
        assertEquals(5000, domain.baseFee)
        assertEquals(2000, domain.peripheralFee)
        assertEquals(1500, domain.extraStoresFee)
        assertEquals(8500, domain.totalFee)
        assertEquals(33.5138, domain.deliveryLat!!, 0.0001)
        assertEquals(36.2765, domain.deliveryLng!!, 0.0001)
        assertEquals("بجانب الحديقة العامة", domain.deliveryDesc)
        assertEquals("يرجى الاتصال عند الوصول", domain.notes)
        assertEquals("run_999", domain.preferredRunnerId)
        assertTrue(domain.waitForPreferred)
        assertEquals("2026-10-01T10:00:00Z", domain.createdAt)
        assertEquals("2026-10-01T10:05:00Z", domain.updatedAt)
        assertEquals("2026-10-01T10:30:00Z", domain.deliveredAt)
        assertNull(domain.cancelledAt)
        assertNull(domain.cancelReason)

        // Items mapping
        assertEquals(2, domain.items.size)
        assertEquals("item_1", domain.items[0].id)
        assertEquals("حليب", domain.items[0].itemName)
        assertEquals("2", domain.items[0].quantity)
        assertEquals("بقالية الشام", domain.items[0].customStoreName)
        assertFalse(domain.items[0].anyStore)
        assertTrue(domain.items[1].anyStore)

        // Stores mapping
        assertEquals(1, domain.stores.size)
        val store = domain.stores[0]
        assertEquals("store_1", store.id)
        assertEquals("بقالية النور", store.storeName)
        assertEquals("COMPLETED", store.status)
        assertTrue(store.isExtra)
        assertEquals(1, store.items.size)
        assertEquals("si_1", store.items[0].id)
        assertEquals("حليب", store.items[0].itemName)
        assertEquals("2", store.items[0].quantity)
        assertEquals(1, store.receipts.size)
        assertEquals("rec_1", store.receipts[0].id)
        assertEquals("https://example.com/receipt.jpg", store.receipts[0].imageUrl)

        // Rating mapping
        assertNotNull(domain.rating)
        assertEquals(5, domain.rating?.stars)
        assertEquals("خدمة ممتازة وسريعة", domain.rating?.note)

        // Timeline mapping
        assertEquals("2026-10-01T10:00:00Z", domain.timeline.createdAt)
        assertEquals("2026-10-01T10:02:00Z", domain.timeline.reviewedAt)
        assertEquals("2026-10-01T10:05:00Z", domain.timeline.assignedAt)
        assertEquals("2026-10-01T10:10:00Z", domain.timeline.startedAt)
        assertEquals("2026-10-01T10:30:00Z", domain.timeline.deliveredAt)
        assertNull(domain.timeline.cancelledAt)

        // Runner mapping
        assertNotNull(domain.runner)
        assertEquals("run_1", domain.runner?.id)
        assertEquals("سامر الأحمد", domain.runner?.name)
        assertEquals(4.9, domain.runner?.avgRating!!, 0.01)
        assertEquals(45, domain.runner?.totalRatings)
        assertEquals("BUSY", domain.runner?.status)
        assertEquals("+963911223344", domain.runner?.whatsapp)
        assertEquals("011223344", domain.runner?.phone)
    }

    @Test
    fun toDomain_fallbacksToOrderStores_whenStoresIsEmpty() {
        val fallbackStore = OrderStoreDetailDto(
            id = "store_legacy",
            storeName = "متجر قديم",
            status = "PENDING"
        )
        val dto = sampleDto(
            stores = emptyList(),
            orderStores = listOf(fallbackStore)
        )

        val domain = dto.toDomain()

        assertEquals(1, domain.stores.size)
        assertEquals("store_legacy", domain.stores[0].id)
        assertEquals("متجر قديم", domain.stores[0].storeName)
    }

    @Test
    fun toDomain_handlesNullOptionalFieldsAndTimelineDefaults() {
        val dto = sampleDto(
            stores = emptyList(),
            orderStores = null,
            rating = null,
            timeline = null,
            runner = null
        )

        val domain = dto.toDomain()

        assertTrue(domain.stores.isEmpty())
        assertNull(domain.rating)
        assertNull(domain.runner)

        // Timeline fallback to order level dates
        assertEquals("2026-10-01T10:00:00Z", domain.timeline.createdAt)
        assertNull(domain.timeline.reviewedAt)
        assertNull(domain.timeline.assignedAt)
        assertNull(domain.timeline.startedAt)
        assertEquals("2026-10-01T10:30:00Z", domain.timeline.deliveredAt)
        assertNull(domain.timeline.cancelledAt)
    }

    @Test
    fun toDomain_timelineFallbackToOrderDates_whenTimelineFieldsAreNull() {
        val incompleteTimeline = OrderTimelineDto(
            createdAt = null,
            reviewedAt = null,
            assignedAt = null,
            startedAt = null,
            deliveredAt = null,
            cancelledAt = null
        )
        val dto = sampleDto(
            timeline = incompleteTimeline
        ).copy(cancelledAt = "2026-10-01T10:20:00Z")

        val domain = dto.toDomain()

        assertEquals("2026-10-01T10:00:00Z", domain.timeline.createdAt)
        assertEquals("2026-10-01T10:30:00Z", domain.timeline.deliveredAt)
        assertEquals("2026-10-01T10:20:00Z", domain.timeline.cancelledAt)
    }
}

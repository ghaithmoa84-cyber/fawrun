package com.forerun.customer.data.remote.repository

import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.api.CustomerApi
import com.forerun.customer.data.remote.api.OrderApi
import com.forerun.customer.data.remote.dto.order.CreateOrderItemDto
import com.forerun.customer.data.remote.dto.order.CreateOrderRequestDto
import com.forerun.customer.data.remote.dto.order.DeliveryAddressDto
import com.forerun.customer.domain.model.CreatedOrder
import com.forerun.customer.domain.model.CustomerAddress
import com.forerun.customer.domain.model.OrderItem
import com.forerun.customer.domain.model.RunnerInfo
import com.forerun.customer.domain.repository.OrderRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepositoryImpl @Inject constructor(
    private val orderApi: OrderApi,
    private val customerApi: CustomerApi
) : OrderRepository {

    override suspend fun createOrder(
        items: List<OrderItem>,
        notes: String?,
        preferredRunnerId: String?,
        waitForPreferred: Boolean,
        deliveryAddress: CustomerAddress
    ): Result<CreatedOrder> {
        val requestDto = CreateOrderRequestDto(
            items = items.map { item ->
                CreateOrderItemDto(
                    itemName = item.itemName.trim(),
                    quantity = item.quantity.trim(),
                    customStoreName = if (item.anyStore) null else item.customStoreName?.trim()?.ifEmpty { null },
                    anyStore = item.anyStore
                )
            },
            notes = notes?.trim()?.ifEmpty { null },
            preferredRunnerId = preferredRunnerId?.trim()?.ifEmpty { null },
            waitForPreferred = waitForPreferred,
            deliveryAddress = DeliveryAddressDto(
                lat = deliveryAddress.lat,
                lng = deliveryAddress.lng,
                description = deliveryAddress.description.trim()
            )
        )

        return when (val response = orderApi.createOrder(requestDto)) {
            is ApiResponse.Success -> {
                val data = response.data
                Result.success(
                    CreatedOrder(
                        id = data.id,
                        orderNumber = data.orderNumber,
                        status = data.status,
                        totalFee = data.estimatedFee.totalFee,
                        feeNote = data.estimatedFee.note
                    )
                )
            }
            is ApiResponse.Error -> {
                Result.failure(Exception(response.message))
            }
        }
    }

    override suspend fun getAvailableRunners(): Result<List<RunnerInfo>> {
        return when (val response = customerApi.getAvailableRunners()) {
            is ApiResponse.Success -> {
                val runners = response.data.map { dto ->
                    RunnerInfo(
                        id = dto.id,
                        name = dto.name,
                        avgRating = dto.avgRating,
                        totalRatings = dto.totalRatings,
                        status = dto.status
                    )
                }
                Result.success(runners)
            }
            is ApiResponse.Error -> {
                Result.failure(Exception(response.message))
            }
        }
    }
}

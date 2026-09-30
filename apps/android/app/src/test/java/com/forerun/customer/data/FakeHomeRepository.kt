package com.forerun.customer.data

import com.forerun.customer.domain.model.ActiveOrder
import com.forerun.customer.domain.model.CustomerProfile
import com.forerun.customer.domain.model.HomeData
import com.forerun.customer.domain.repository.HomeRepository

class FakeHomeRepository : HomeRepository {

    var homeDataResult: Result<HomeData> = Result.success(
        HomeData(
            profile = CustomerProfile(
                id = "c1",
                name = "عميل تجريبي",
                whatsapp = "0988888888",
                altPhone = null,
                status = "VERIFIED",
                completedOrders = 5,
                totalFeesPaid = 25000
            ),
            activeOrder = null
        )
    )

    override suspend fun getHomeData(): Result<HomeData> {
        return homeDataResult
    }
}

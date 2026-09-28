package com.forerun.customer.domain.repository

import com.forerun.customer.domain.model.HomeData

interface HomeRepository {
    suspend fun getHomeData(): Result<HomeData>
}

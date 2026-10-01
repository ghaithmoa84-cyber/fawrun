package com.forerun.customer.core.di

import com.forerun.customer.data.gateway.SocketOrderEventsGateway
import com.forerun.customer.domain.gateway.OrderEventsGateway
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class GatewayModule {

    @Binds
    @Singleton
    abstract fun bindOrderEventsGateway(
        socketOrderEventsGateway: SocketOrderEventsGateway
    ): OrderEventsGateway
}

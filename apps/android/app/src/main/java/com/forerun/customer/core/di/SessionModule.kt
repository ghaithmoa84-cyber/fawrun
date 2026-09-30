package com.forerun.customer.core.di

import com.forerun.customer.core.auth.SessionExpiryNotifier
import com.forerun.customer.data.remote.token.DefaultSessionExpiryNotifier
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class SessionModule {
    @Binds
    @Singleton
    abstract fun bindSessionExpiryNotifier(
        defaultSessionExpiryNotifier: DefaultSessionExpiryNotifier
    ): SessionExpiryNotifier
}

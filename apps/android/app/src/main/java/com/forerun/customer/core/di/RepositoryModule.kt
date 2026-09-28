package com.forerun.customer.core.di

import com.forerun.customer.data.remote.repository.AuthRepositoryImpl
import com.forerun.customer.domain.repository.AuthRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(
        authRepositoryImpl: AuthRepositoryImpl
    ): AuthRepository

    @Binds
    @Singleton
    abstract fun bindHomeRepository(
        homeRepositoryImpl: com.forerun.customer.data.remote.repository.HomeRepositoryImpl
    ): com.forerun.customer.domain.repository.HomeRepository
}

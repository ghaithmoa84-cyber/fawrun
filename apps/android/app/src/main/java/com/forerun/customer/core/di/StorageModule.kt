package com.forerun.customer.core.di

import com.forerun.customer.core.storage.EncryptedTokenStorage
import com.forerun.customer.core.storage.TokenStorage
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class StorageModule {

    @Binds
    @Singleton
    abstract fun bindTokenStorage(
        encryptedTokenStorage: EncryptedTokenStorage
    ): TokenStorage
}

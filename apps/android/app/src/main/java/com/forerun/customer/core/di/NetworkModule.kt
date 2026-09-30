package com.forerun.customer.core.di

import com.forerun.customer.BuildConfig
import com.forerun.customer.core.network.ApiCallAdapterFactory
import com.forerun.customer.core.network.interceptor.AuthInterceptor
import com.forerun.customer.core.network.interceptor.HeaderInterceptor
import com.forerun.customer.core.network.interceptor.RefreshInterceptor
import com.squareup.moshi.Moshi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val BASE_URL = "https://fawrun-api-production.up.railway.app/api/v1/"

    @Provides
    @Singleton
    fun provideMoshi(): Moshi {
        return Moshi.Builder().build()
    }

    @Provides
    @Singleton
    fun provideTokenRefreshManager(
        tokenStorage: com.forerun.customer.core.storage.TokenStorage,
        authApiProvider: javax.inject.Provider<com.forerun.customer.data.remote.api.AuthApi>
    ): com.forerun.customer.data.remote.token.TokenRefreshManager {
        return com.forerun.customer.data.remote.token.TokenRefreshManager(tokenStorage, authApiProvider)
    }



    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        headerInterceptor: HeaderInterceptor,
        authInterceptor: AuthInterceptor,
        refreshInterceptor: RefreshInterceptor,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(headerInterceptor)
            .addInterceptor(authInterceptor)
            .addInterceptor(refreshInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        moshi: Moshi
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi).withNullSerialization())
            .addCallAdapterFactory(ApiCallAdapterFactory.create(moshi))
            .build()
    }
}

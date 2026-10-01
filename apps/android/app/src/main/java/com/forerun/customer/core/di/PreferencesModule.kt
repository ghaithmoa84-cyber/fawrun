package com.forerun.customer.core.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStoreFile
import com.forerun.customer.core.storage.DefaultOnboardingPrefs
import com.forerun.customer.core.storage.OnboardingPrefs
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for preferences and DataStore bindings.
 * Converted to abstract class with @Binds in Sprint 8D (DI-2).
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class PreferencesModule {

    @Binds
    @Singleton
    abstract fun bindOnboardingPrefs(
        defaultOnboardingPrefs: DefaultOnboardingPrefs
    ): OnboardingPrefs

    companion object {
        private const val PREFERENCES_NAME = "forerun_preferences"

        @Provides
        @Singleton
        fun providePreferencesDataStore(
            @ApplicationContext context: Context
        ): DataStore<Preferences> {
            return PreferenceDataStoreFactory.create(
                produceFile = { context.preferencesDataStoreFile(PREFERENCES_NAME) }
            )
        }
    }
}

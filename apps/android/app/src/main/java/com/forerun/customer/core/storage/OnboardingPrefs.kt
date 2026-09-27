package com.forerun.customer.core.storage

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OnboardingPrefs @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    val isOnboardingSeen: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[KEY_ONBOARDING_SEEN] ?: false
    }

    suspend fun setSeen(seen: Boolean = true) {
        dataStore.edit { preferences ->
            preferences[KEY_ONBOARDING_SEEN] = seen
        }
    }

    companion object {
        private val KEY_ONBOARDING_SEEN = booleanPreferencesKey("onboarding_seen")
    }
}

package com.forerun.customer

import android.app.Application
import android.util.Log
import dagger.hilt.android.HiltAndroidApp
import org.maplibre.android.MapLibre

@HiltAndroidApp
class ForerunApp : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            MapLibre.getInstance(this)
        } catch (e: Throwable) {
            Log.e("ForerunApp", "Failed to initialize MapLibre", e)
        }
    }
}

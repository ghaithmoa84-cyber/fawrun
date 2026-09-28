package com.forerun.customer

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.util.Log
import com.forerun.customer.core.websocket.SocketManager
import dagger.hilt.android.HiltAndroidApp
import org.maplibre.android.MapLibre
import javax.inject.Inject

@HiltAndroidApp
class ForerunApp : Application() {

    @Inject
    lateinit var socketManager: SocketManager

    override fun onCreate() {
        super.onCreate()
        try {
            MapLibre.getInstance(this)
        } catch (e: Throwable) {
            Log.e("ForerunApp", "Failed to initialize MapLibre", e)
        }

        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            private var startedActivityCount = 0

            override fun onActivityStarted(activity: Activity) {
                if (++startedActivityCount == 1) {
                    socketManager.onAppForegrounded()
                }
            }

            override fun onActivityStopped(activity: Activity) {
                if (--startedActivityCount == 0) {
                    socketManager.onAppBackgrounded()
                }
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityResumed(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })
    }
}

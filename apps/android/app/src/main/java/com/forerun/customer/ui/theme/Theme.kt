package com.forerun.customer.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val ForerunColorScheme = lightColorScheme(
    primary = ForerunGreen,
    onPrimary = ForerunTextOnPrimary,
    primaryContainer = ForerunGreenLight,
    onPrimaryContainer = ForerunGreenDark,

    secondary = WhatsAppGreen,
    onSecondary = ForerunTextOnPrimary,

    background = ForerunBackground,
    onBackground = ForerunTextPrimary,

    surface = ForerunSurface,
    onSurface = ForerunTextPrimary,
    surfaceVariant = ForerunSoftSurface,
    onSurfaceVariant = ForerunTextMuted,

    outline = ForerunBorder,
    outlineVariant = ForerunBorder,

    error = ForerunDanger,
    onError = ForerunTextOnPrimary,
    errorContainer = ForerunDangerLight,
    onErrorContainer = ForerunDanger
)

@Composable
fun ForerunTheme(
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = ForerunGreen.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = ForerunColorScheme,
        typography = ForerunTypography,
        content = content
    )
}

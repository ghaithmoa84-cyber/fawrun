package com.forerun.customer.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection

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
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(
            colorScheme = ForerunColorScheme,
            typography = ForerunTypography,
            content = content
        )
    }
}

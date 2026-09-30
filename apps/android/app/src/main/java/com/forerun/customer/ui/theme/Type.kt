package com.forerun.customer.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.sp
import com.forerun.customer.R

val Cairo = FontFamily(
    Font(R.font.cairo_regular, FontWeight.Normal),
    Font(R.font.cairo_medium, FontWeight.Medium),
    Font(R.font.cairo_semibold, FontWeight.SemiBold),
    Font(R.font.cairo_bold, FontWeight.Bold)
)

private val DefaultLineHeight = LineHeightStyle(
    alignment = LineHeightStyle.Alignment.Center,
    trim = LineHeightStyle.Trim.None
)

val ForerunTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 44.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    headlineMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 34.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    headlineSmall = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 30.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    titleLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 28.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    titleMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    bodyLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 26.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    bodyMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 22.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    bodySmall = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 18.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    labelLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    labelMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        lineHeightStyle = DefaultLineHeight
    ),
    labelSmall = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        lineHeightStyle = DefaultLineHeight
    )
)

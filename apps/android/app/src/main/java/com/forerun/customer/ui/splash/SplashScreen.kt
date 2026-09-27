package com.forerun.customer.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.forerun.customer.R
import com.forerun.customer.ui.theme.Dimens
import com.forerun.customer.ui.theme.ForerunGreen
import com.forerun.customer.ui.theme.ForerunGreenDark
import com.forerun.customer.ui.theme.ForerunGreenLight
import com.forerun.customer.ui.theme.ForerunTextMuted
import com.forerun.customer.ui.theme.ForerunTextPrimary

@Composable
fun SplashScreen(
    onNavigate: (SplashDestination) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SplashViewModel = hiltViewModel()
) {
    val scale = remember { Animatable(0.85f) }
    val alpha = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        scale.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 400, easing = FastOutSlowInEasing)
        )
    }

    LaunchedEffect(Unit) {
        alpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 400, easing = FastOutSlowInEasing)
        )
    }

    LaunchedEffect(viewModel) {
        viewModel.destination.collect { destination ->
            onNavigate(destination)
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(ForerunGreenLight),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .scale(scale.value)
                .alpha(alpha.value)
                .padding(Dimens.ScreenMargin)
        ) {
            // Brand Logo Circle
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .background(color = ForerunGreen, shape = CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = stringResource(R.string.app_name),
                    color = ForerunGreenLight,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(Dimens.Space24))

            // App Name Arabic & Latin
            Text(
                text = stringResource(R.string.app_name),
                fontSize = 36.sp,
                fontWeight = FontWeight.Bold,
                color = ForerunGreenDark
            )

            Spacer(modifier = Modifier.height(Dimens.Space4))

            Text(
                text = stringResource(R.string.app_name_latin),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 2.sp,
                color = ForerunTextPrimary
            )

            Spacer(modifier = Modifier.height(Dimens.Space12))

            // Tagline
            Text(
                text = stringResource(R.string.splash_tagline),
                fontSize = 16.sp,
                color = ForerunTextMuted
            )

            Spacer(modifier = Modifier.height(Dimens.Space48))

            CircularProgressIndicator(
                modifier = Modifier.size(32.dp),
                color = ForerunGreen,
                strokeWidth = 3.dp
            )
        }
    }
}

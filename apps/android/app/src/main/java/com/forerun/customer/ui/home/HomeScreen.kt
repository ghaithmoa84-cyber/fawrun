package com.forerun.customer.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.forerun.customer.R
import com.forerun.customer.ui.theme.Dimens
import com.forerun.customer.ui.theme.ForerunBackground
import com.forerun.customer.ui.theme.ForerunBorder
import com.forerun.customer.ui.theme.ForerunDanger
import com.forerun.customer.ui.theme.ForerunGreen
import com.forerun.customer.ui.theme.ForerunGreenDark
import com.forerun.customer.ui.theme.ForerunGreenLight
import com.forerun.customer.ui.theme.ForerunSoftSurface
import com.forerun.customer.ui.theme.ForerunSuccess
import com.forerun.customer.ui.theme.ForerunSuccessLight
import com.forerun.customer.ui.theme.ForerunTextMuted
import com.forerun.customer.ui.theme.ForerunTextPrimary

@Composable
fun HomeScreen(
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()

    LaunchedEffect(viewModel) {
        viewModel.navigateToLogin.collect {
            onNavigateToLogin()
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(ForerunBackground)
            .padding(Dimens.ScreenMargin),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(Dimens.Space32))

            // Header Icon
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(ForerunGreenLight),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "ف",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = ForerunGreen
                )
            }

            Spacer(modifier = Modifier.height(Dimens.Space16))

            // Welcome Text
            val name = currentUser?.name?.ifBlank { "عميلنا العزيز" } ?: "عميلنا العزيز"
            Text(
                text = stringResource(R.string.home_welcome, name),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = ForerunTextPrimary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(Dimens.Space4))

            Text(
                text = stringResource(R.string.home_subtitle),
                fontSize = 14.sp,
                color = ForerunTextMuted,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(Dimens.Space24))

            // Verified Badge Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = CardDefaults.cardColors(containerColor = ForerunSuccessLight)
            ) {
                Row(
                    modifier = Modifier.padding(Dimens.Space16),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = ForerunSuccess,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.size(Dimens.Space12))
                    Text(
                        text = stringResource(R.string.home_status_verified),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ForerunGreenDark
                    )
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Space16))

            // Sprint 1.5 Coming Soon Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = CardDefaults.cardColors(containerColor = ForerunSoftSurface)
            ) {
                Column(
                    modifier = Modifier.padding(Dimens.Space24),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = stringResource(R.string.home_new_order_coming_soon),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = ForerunTextMuted,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        // Logout Button at Bottom
        OutlinedButton(
            onClick = viewModel::logout,
            modifier = Modifier
                .fillMaxWidth()
                .height(Dimens.ButtonHeight),
            shape = RoundedCornerShape(Dimens.RadiusMedium),
            border = androidx.compose.foundation.BorderStroke(1.dp, ForerunBorder)
        ) {
            Text(
                text = stringResource(R.string.logout),
                color = ForerunDanger,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

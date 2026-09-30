package com.forerun.customer.ui.auth.status

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
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
import com.forerun.customer.ui.theme.ForerunDangerLight
import com.forerun.customer.ui.theme.ForerunTextMuted
import com.forerun.customer.ui.theme.ForerunTextOnPrimary
import com.forerun.customer.ui.theme.ForerunTextPrimary

@Composable
fun SuspendedScreen(
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SuspendedViewModel = hiltViewModel()
) {
    val isLoggingOut by viewModel.isLoggingOut.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(viewModel) {
        viewModel.navigateToLogin.collect {
            onNavigateToLogin()
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(ForerunBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = Dimens.ScreenMargin, vertical = Dimens.Space24),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(ForerunDangerLight),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = null,
                modifier = Modifier.size(52.dp),
                tint = ForerunDanger
            )
        }

        Spacer(modifier = Modifier.height(Dimens.Space24))

        Text(
            text = stringResource(R.string.suspended_title),
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = ForerunTextPrimary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(Dimens.Space12))

        Text(
            text = stringResource(R.string.suspended_desc),
            fontSize = 15.sp,
            color = ForerunTextMuted,
            textAlign = TextAlign.Center,
            lineHeight = 24.sp,
            modifier = Modifier.padding(horizontal = Dimens.Space16)
        )

        Spacer(modifier = Modifier.height(Dimens.Space32))

        // Support Contact Button
        Button(
            onClick = {
                val intent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse(com.forerun.customer.core.config.AppConfig.buildWhatsAppUrl("مرحباً إدارة فَوْراً، أود الاستفسار عن سبب تعليق حسابي"))
                )
                try {
                    context.startActivity(intent)
                } catch (_: Exception) {
                    // Fallback
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(Dimens.ButtonHeight),
            shape = RoundedCornerShape(Dimens.RadiusMedium),
            colors = ButtonDefaults.buttonColors(
                containerColor = ForerunDanger,
                contentColor = ForerunTextOnPrimary
            )
        ) {
            Text(
                text = stringResource(R.string.contact_support),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(Dimens.Space12))

        // Logout Button
        OutlinedButton(
            onClick = viewModel::logout,
            enabled = !isLoggingOut,
            modifier = Modifier
                .fillMaxWidth()
                .height(Dimens.ButtonHeight),
            shape = RoundedCornerShape(Dimens.RadiusMedium),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = ForerunTextMuted
            ),
            border = androidx.compose.foundation.BorderStroke(1.dp, ForerunBorder)
        ) {
            if (isLoggingOut) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = ForerunTextMuted,
                    strokeWidth = 2.dp
                )
            } else {
                Text(
                    text = stringResource(R.string.logout),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

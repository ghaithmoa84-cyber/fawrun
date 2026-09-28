package com.forerun.customer.ui.account

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.forerun.customer.R
import com.forerun.customer.ui.theme.Dimens
import com.forerun.customer.ui.theme.ForerunBackground
import com.forerun.customer.ui.theme.ForerunDanger
import com.forerun.customer.ui.theme.ForerunGreen
import com.forerun.customer.ui.theme.ForerunGreenLight
import com.forerun.customer.ui.theme.ForerunTextMuted
import com.forerun.customer.ui.theme.ForerunTextPrimary

@Composable
fun AccountScreen(
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(ForerunBackground)
            .padding(Dimens.Space16),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(ForerunGreenLight),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                tint = ForerunGreen,
                modifier = Modifier.size(36.dp)
            )
        }

        Spacer(modifier = Modifier.height(Dimens.Space16))

        Text(
            text = stringResource(R.string.account_title),
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = ForerunTextPrimary
        )

        Spacer(modifier = Modifier.height(Dimens.Space8))

        Text(
            text = stringResource(R.string.account_stub_desc),
            fontSize = 14.sp,
            color = ForerunTextMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(0.85f)
        )

        Spacer(modifier = Modifier.height(Dimens.Space24))

        OutlinedButton(
            onClick = onNavigateToLogin,
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = ForerunDanger
            )
        ) {
            Text(
                text = stringResource(R.string.logout),
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

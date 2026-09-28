package com.forerun.customer.ui.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.forerun.customer.R
import com.forerun.customer.domain.model.ActiveOrder
import com.forerun.customer.domain.model.CustomerProfile
import com.forerun.customer.ui.theme.Dimens
import com.forerun.customer.ui.theme.ForerunBackground
import com.forerun.customer.ui.theme.ForerunBorder
import com.forerun.customer.ui.theme.ForerunGreen
import com.forerun.customer.ui.theme.ForerunGreenDark
import com.forerun.customer.ui.theme.ForerunGreenLight
import com.forerun.customer.ui.theme.ForerunSoftSurface
import com.forerun.customer.ui.theme.ForerunSuccess
import com.forerun.customer.ui.theme.ForerunSuccessLight
import com.forerun.customer.ui.theme.ForerunTextMuted
import com.forerun.customer.ui.theme.ForerunTextPrimary

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToCreateOrder: () -> Unit = {},
    onNavigateToOrderDetail: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(viewModel) {
        viewModel.navigateToLogin.collect {
            onNavigateToLogin()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(ForerunBackground)
    ) {
        when (val state = uiState) {
            is HomeUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = ForerunGreen)
                }
            }

            is HomeUiState.Error -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(Dimens.Space24),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = state.message,
                        fontSize = 16.sp,
                        color = ForerunTextMuted,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(Dimens.Space16))
                    Button(
                        onClick = { viewModel.handleIntent(HomeIntent.Refresh) },
                        colors = ButtonDefaults.buttonColors(containerColor = ForerunGreen)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Spacer(modifier = Modifier.width(Dimens.Space8))
                        Text(stringResource(R.string.home_retry))
                    }
                }
            }

            is HomeUiState.Success -> {
                PullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.onIntent(HomeIntent.Refresh) },
                    modifier = Modifier.fillMaxSize()
                ) {
                    HomeContent(
                        profile = state.profile,
                        activeOrder = state.activeOrder,
                        onNewOrderClick = onNavigateToCreateOrder,
                        onOrderDetailClick = onNavigateToOrderDetail
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeContent(
    profile: CustomerProfile,
    activeOrder: ActiveOrder?,
    onNewOrderClick: () -> Unit,
    onOrderDetailClick: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = Dimens.ScreenMargin, vertical = Dimens.Space16)
    ) {
        // Top Bar: Logo + Brand
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painter = painterResource(id = R.drawable.logo),
                    contentDescription = stringResource(R.string.app_name),
                    modifier = Modifier.size(40.dp)
                )
                Spacer(modifier = Modifier.width(Dimens.Space8))
                Column {
                    Text(
                        text = stringResource(R.string.app_name),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForerunGreen
                    )
                    Text(
                        text = stringResource(R.string.home_subtitle),
                        fontSize = 11.sp,
                        color = ForerunTextMuted
                    )
                }
            }

            // Verified Badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(Dimens.RadiusPill))
                    .background(ForerunSuccessLight)
                    .padding(horizontal = Dimens.Space10, vertical = Dimens.Space4)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = ForerunSuccess,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(Dimens.Space4))
                    Text(
                        text = stringResource(R.string.home_status_verified),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ForerunSuccess
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(Dimens.Space16))

        // Greeting Card
        Text(
            text = stringResource(R.string.home_welcome, profile.name),
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = ForerunTextPrimary
        )

        Spacer(modifier = Modifier.height(Dimens.Space16))

        // Hero CTA Banner: New Order Button
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(Dimens.RadiusLarge))
                .clickable { onNewOrderClick() },
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(ForerunGreenDark, ForerunGreen)
                        )
                    )
                    .padding(Dimens.Space20)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = stringResource(R.string.home_new_order_title),
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(Dimens.Space8))
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(Dimens.Space4))
                        Text(
                            text = stringResource(R.string.home_new_order_desc),
                            fontSize = 13.sp,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingCart,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(Dimens.Space20))

        // Active Order Section
        Text(
            text = stringResource(R.string.home_active_order_title),
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = ForerunTextPrimary
        )

        Spacer(modifier = Modifier.height(Dimens.Space8))

        if (activeOrder != null) {
            ActiveOrderCard(
                order = activeOrder,
                onClick = { onOrderDetailClick(activeOrder.id) }
            )
        } else {
            EmptyActiveOrderCard(onNewOrderClick = onNewOrderClick)
        }

        Spacer(modifier = Modifier.height(Dimens.Space20))

        // Account Stats Card
        StatsCard(profile = profile)

        Spacer(modifier = Modifier.height(Dimens.Space24))
    }
}

@Composable
private fun ActiveOrderCard(
    order: ActiveOrder,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Dimens.RadiusMedium))
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = ForerunSoftSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(Dimens.Space16)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.home_order_num, order.orderNumber),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = ForerunTextPrimary
                )
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(Dimens.RadiusPill))
                        .background(ForerunGreenLight)
                        .padding(horizontal = Dimens.Space8, vertical = Dimens.Space2)
                ) {
                    Text(
                        text = order.status,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ForerunGreen
                    )
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Space8))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = stringResource(R.string.home_items_count, order.itemCount),
                    fontSize = 13.sp,
                    color = ForerunTextMuted
                )
                Text(
                    text = "${order.totalFee} ${stringResource(R.string.home_currency)}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = ForerunTextPrimary
                )
            }

            if (!order.runnerName.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(Dimens.Space8))
                Text(
                    text = "${stringResource(R.string.home_runner_label)} ${order.runnerName}",
                    fontSize = 13.sp,
                    color = ForerunTextPrimary,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(Dimens.Space12))

            Text(
                text = stringResource(R.string.home_track_order),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = ForerunGreen
            )
        }
    }
}

@Composable
private fun EmptyActiveOrderCard(onNewOrderClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Dimens.RadiusMedium)),
        colors = CardDefaults.cardColors(containerColor = ForerunSoftSurface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(Dimens.Space16),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(R.string.home_no_active_orders),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = ForerunTextPrimary
            )
            Spacer(modifier = Modifier.height(Dimens.Space4))
            Text(
                text = stringResource(R.string.home_no_active_orders_desc),
                fontSize = 12.sp,
                color = ForerunTextMuted,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun StatsCard(profile: CustomerProfile) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Dimens.RadiusMedium)),
        colors = CardDefaults.cardColors(containerColor = ForerunBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(Dimens.Space16)
        ) {
            Text(
                text = stringResource(R.string.home_stats_title),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = ForerunTextPrimary
            )

            Spacer(modifier = Modifier.height(Dimens.Space12))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "${profile.completedOrders}",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForerunGreen
                    )
                    Text(
                        text = stringResource(R.string.home_completed_orders),
                        fontSize = 12.sp,
                        color = ForerunTextMuted
                    )
                }

                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(36.dp)
                        .background(ForerunBorder)
                )

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "${profile.totalFeesPaid} ${stringResource(R.string.home_currency)}",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForerunGreen
                    )
                    Text(
                        text = stringResource(R.string.home_total_fees),
                        fontSize = 12.sp,
                        color = ForerunTextMuted
                    )
                }
            }
        }
    }
}

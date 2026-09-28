package com.forerun.customer.ui.order.create

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.forerun.customer.R
import com.forerun.customer.domain.model.OrderItem
import com.forerun.customer.ui.theme.Dimens
import com.forerun.customer.ui.theme.ForerunBackground
import com.forerun.customer.ui.theme.ForerunBorder
import com.forerun.customer.ui.theme.ForerunDanger
import com.forerun.customer.ui.theme.ForerunGreen
import com.forerun.customer.ui.theme.ForerunGreenLight
import com.forerun.customer.ui.theme.ForerunSoftSurface
import com.forerun.customer.ui.theme.ForerunSuccess
import com.forerun.customer.ui.theme.ForerunSurface
import com.forerun.customer.ui.theme.ForerunTextMuted
import com.forerun.customer.ui.theme.ForerunTextOnPrimary
import com.forerun.customer.ui.theme.ForerunTextPrimary
import com.forerun.customer.ui.theme.ForerunWarning
import com.forerun.customer.ui.theme.ForerunWarningLight

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateOrderScreen(
    onNavigateBack: () -> Unit,
    onNavigateToAddressSetup: () -> Unit,
    onNavigateToOrders: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CreateOrderViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.onIntent(CreateOrderIntent.LoadInitialData)
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.onIntent(CreateOrderIntent.ClearError)
        }
    }

    LaunchedEffect(uiState.validationError) {
        uiState.validationError?.let { warning ->
            snackbarHostState.showSnackbar(warning)
            viewModel.onIntent(CreateOrderIntent.ClearError)
        }
    }

    // Success Confirmation Dialog
    uiState.createdOrder?.let { order ->
        AlertDialog(
            onDismissRequest = { viewModel.onIntent(CreateOrderIntent.DismissSuccess) },
            icon = {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = ForerunSuccess,
                    modifier = Modifier.size(52.dp)
                )
            },
            title = {
                Text(
                    text = stringResource(R.string.create_order_success_title),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    textAlign = TextAlign.Center
                )
            },
            text = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = stringResource(R.string.create_order_success_desc),
                        fontSize = 14.sp,
                        color = ForerunTextMuted,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(Dimens.Space12))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(Dimens.RadiusMedium))
                            .background(ForerunGreenLight)
                            .padding(horizontal = Dimens.Space16, vertical = Dimens.Space8)
                    ) {
                        Text(
                            text = stringResource(R.string.create_order_success_order_number, order.orderNumber),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = ForerunGreen
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.onIntent(CreateOrderIntent.DismissSuccess)
                        onNavigateToOrders()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ForerunGreen,
                        contentColor = ForerunTextOnPrimary
                    )
                ) {
                    Text(stringResource(R.string.create_order_track_order_btn), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        viewModel.onIntent(CreateOrderIntent.DismissSuccess)
                        onNavigateBack()
                    }
                ) {
                    Text(stringResource(R.string.create_order_back_home_btn), color = ForerunTextMuted)
                }
            }
        )
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.create_order_title),
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = ForerunTextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "الرجوع",
                            tint = ForerunTextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ForerunSurface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onIntent(CreateOrderIntent.AddItem) },
                containerColor = ForerunGreen,
                contentColor = ForerunTextOnPrimary,
                modifier = Modifier.padding(bottom = 70.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = stringResource(R.string.create_order_add_item)
                )
            }
        },
        bottomBar = {
            // Bottom Action Dock
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(topStart = Dimens.RadiusLarge, topEnd = Dimens.RadiusLarge),
                colors = CardDefaults.cardColors(containerColor = ForerunSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = Dimens.Space16, vertical = Dimens.Space12)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(R.string.create_order_items_count_summary, uiState.items.size),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = ForerunTextPrimary
                        )
                        Text(
                            text = if (uiState.deliveryAddress != null) "العنوان جاهز ✓" else "العنوان غير محدد ⚠️",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (uiState.deliveryAddress != null) ForerunGreen else ForerunWarning
                        )
                    }

                    Spacer(modifier = Modifier.height(Dimens.Space8))

                    Button(
                        onClick = { viewModel.onIntent(CreateOrderIntent.SubmitOrder) },
                        enabled = !uiState.isSubmitting,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(Dimens.ButtonHeight),
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ForerunGreen,
                            contentColor = ForerunTextOnPrimary
                        )
                    ) {
                        if (uiState.isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = ForerunTextOnPrimary,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(Dimens.Space8))
                            Text(
                                text = stringResource(R.string.create_order_submitting_button),
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        } else {
                            Text(
                                text = stringResource(R.string.create_order_submit_button),
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(ForerunSoftSurface)
                .padding(innerPadding),
            contentPadding = PaddingValues(Dimens.Space16),
            verticalArrangement = Arrangement.spacedBy(Dimens.Space16)
        ) {
            // 1. Delivery Address Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                    colors = CardDefaults.cardColors(
                        containerColor = if (uiState.deliveryAddress != null) ForerunSurface else ForerunWarningLight
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(Dimens.Space16)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = if (uiState.deliveryAddress != null) ForerunGreen else ForerunWarning,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(Dimens.Space8))
                            Text(
                                text = stringResource(R.string.create_order_address_header),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = ForerunTextPrimary
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            TextButton(onClick = onNavigateToAddressSetup) {
                                Text(
                                    text = if (uiState.deliveryAddress != null) {
                                        stringResource(R.string.create_order_change_address)
                                    } else {
                                        stringResource(R.string.create_order_set_address_now)
                                    },
                                    fontSize = 13.sp,
                                    color = ForerunGreen,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(Dimens.Space4))

                        if (uiState.deliveryAddress != null) {
                            Text(
                                text = uiState.deliveryAddress?.description ?: "",
                                fontSize = 14.sp,
                                color = ForerunTextPrimary,
                                fontWeight = FontWeight.Medium
                            )
                        } else {
                            Text(
                                text = stringResource(R.string.create_order_no_address_warning),
                                fontSize = 13.sp,
                                color = ForerunWarning
                            )
                        }
                    }
                }
            }

            // 2. Items Section Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(R.string.create_order_items_section),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForerunTextPrimary
                    )
                    OutlinedButton(
                        onClick = { viewModel.onIntent(CreateOrderIntent.AddItem) },
                        contentPadding = PaddingValues(horizontal = Dimens.Space12, vertical = Dimens.Space4),
                        shape = RoundedCornerShape(Dimens.RadiusPill),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = ForerunGreen)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(Dimens.Space4))
                        Text(stringResource(R.string.create_order_add_item), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // 3. Dynamic Order Items List
            itemsIndexed(uiState.items, key = { _, item -> item.id }) { index, item ->
                OrderItemCard(
                    index = index + 1,
                    item = item,
                    canDelete = uiState.items.size > 1,
                    onNameChange = { viewModel.onIntent(CreateOrderIntent.UpdateItemName(item.id, it)) },
                    onQuantityChange = { viewModel.onIntent(CreateOrderIntent.UpdateItemQuantity(item.id, it)) },
                    onAnyStoreToggle = { viewModel.onIntent(CreateOrderIntent.ToggleItemAnyStore(item.id, it)) },
                    onCustomStoreChange = { viewModel.onIntent(CreateOrderIntent.UpdateItemCustomStore(item.id, it)) },
                    onDelete = { viewModel.onIntent(CreateOrderIntent.RemoveItem(item.id)) }
                )
            }

            // 4. Notes Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                    colors = CardDefaults.cardColors(containerColor = ForerunSurface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(Dimens.Space16)
                    ) {
                        Text(
                            text = stringResource(R.string.create_order_notes_section),
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = ForerunTextPrimary
                        )
                        Spacer(modifier = Modifier.height(Dimens.Space8))
                        OutlinedTextField(
                            value = uiState.notes,
                            onValueChange = { viewModel.onIntent(CreateOrderIntent.UpdateNotes(it)) },
                            label = { Text(stringResource(R.string.create_order_notes_label)) },
                            placeholder = { Text(stringResource(R.string.create_order_notes_hint), fontSize = 13.sp) },
                            maxLines = 3,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(Dimens.RadiusMedium),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = ForerunGreen,
                                focusedLabelColor = ForerunGreen,
                                cursorColor = ForerunGreen
                            )
                        )
                    }
                }
            }

            // 5. Preferred Runner Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                    colors = CardDefaults.cardColors(containerColor = ForerunSurface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(Dimens.Space16)
                    ) {
                        Text(
                            text = stringResource(R.string.create_order_runner_section),
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = ForerunTextPrimary
                        )

                        Spacer(modifier = Modifier.height(Dimens.Space8))

                        // Any Runner Option
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(Dimens.RadiusSmall))
                                .background(if (uiState.selectedRunnerId == null) ForerunGreenLight else ForerunSoftSurface)
                                .clickable { viewModel.onIntent(CreateOrderIntent.SelectRunner(null)) }
                                .padding(Dimens.Space12),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = if (uiState.selectedRunnerId == null) ForerunGreen else ForerunTextMuted,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(Dimens.Space8))
                            Text(
                                text = stringResource(R.string.create_order_any_runner),
                                fontSize = 13.sp,
                                fontWeight = if (uiState.selectedRunnerId == null) FontWeight.Bold else FontWeight.Normal,
                                color = if (uiState.selectedRunnerId == null) ForerunGreen else ForerunTextPrimary
                            )
                        }

                        // Available Runners List (if any)
                        if (uiState.availableRunners.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(Dimens.Space8))
                            uiState.availableRunners.forEach { runner ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = Dimens.Space4)
                                        .clip(RoundedCornerShape(Dimens.RadiusSmall))
                                        .background(if (uiState.selectedRunnerId == runner.id) ForerunGreenLight else ForerunSoftSurface)
                                        .clickable { viewModel.onIntent(CreateOrderIntent.SelectRunner(runner.id)) }
                                        .padding(Dimens.Space12),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Person,
                                        contentDescription = null,
                                        tint = if (uiState.selectedRunnerId == runner.id) ForerunGreen else ForerunTextMuted,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(Dimens.Space8))
                                    Text(
                                        text = runner.name,
                                        fontSize = 13.sp,
                                        fontWeight = if (uiState.selectedRunnerId == runner.id) FontWeight.Bold else FontWeight.Normal,
                                        color = if (uiState.selectedRunnerId == runner.id) ForerunGreen else ForerunTextPrimary
                                    )
                                    if (runner.avgRating != null) {
                                        Spacer(modifier = Modifier.weight(1f))
                                        Text(
                                            text = "⭐ ${runner.avgRating}",
                                            fontSize = 12.sp,
                                            color = ForerunWarning
                                        )
                                    }
                                }
                            }
                        }

                        // Wait for Preferred Runner toggle
                        if (uiState.selectedRunnerId != null) {
                            Spacer(modifier = Modifier.height(Dimens.Space12))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = stringResource(R.string.create_order_wait_for_preferred_toggle),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = ForerunTextPrimary
                                    )
                                    Text(
                                        text = stringResource(R.string.create_order_wait_for_preferred_desc),
                                        fontSize = 11.sp,
                                        color = ForerunTextMuted
                                    )
                                }
                                Switch(
                                    checked = uiState.waitForPreferred,
                                    onCheckedChange = { viewModel.onIntent(CreateOrderIntent.ToggleWaitForPreferred(it)) },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = ForerunSurface,
                                        checkedTrackColor = ForerunGreen
                                    )
                                )
                            }
                        }
                    }
                }
            }

            // 6. Disclaimer
            item {
                Text(
                    text = stringResource(R.string.create_order_pricing_disclaimer),
                    fontSize = 12.sp,
                    color = ForerunTextMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = Dimens.Space8)
                )
            }

            item {
                Spacer(modifier = Modifier.height(Dimens.Space32))
            }
        }
    }
}

@Composable
private fun OrderItemCard(
    index: Int,
    item: OrderItem,
    canDelete: Boolean,
    onNameChange: (String) -> Unit,
    onQuantityChange: (String) -> Unit,
    onAnyStoreToggle: (Boolean) -> Unit,
    onCustomStoreChange: (String) -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(Dimens.RadiusMedium),
        colors = CardDefaults.cardColors(containerColor = ForerunSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(Dimens.Space16)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.create_order_item_header, index),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = ForerunGreen
                )
                if (canDelete) {
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = stringResource(R.string.create_order_delete_item),
                            tint = ForerunDanger,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Space8))

            // Item Name
            OutlinedTextField(
                value = item.itemName,
                onValueChange = onNameChange,
                label = { Text(stringResource(R.string.create_order_item_name_label)) },
                placeholder = { Text(stringResource(R.string.create_order_item_name_hint), fontSize = 13.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ForerunGreen,
                    focusedLabelColor = ForerunGreen,
                    cursorColor = ForerunGreen
                )
            )

            Spacer(modifier = Modifier.height(Dimens.Space8))

            // Quantity
            OutlinedTextField(
                value = item.quantity,
                onValueChange = onQuantityChange,
                label = { Text(stringResource(R.string.create_order_item_quantity_label)) },
                placeholder = { Text(stringResource(R.string.create_order_item_quantity_hint), fontSize = 13.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ForerunGreen,
                    focusedLabelColor = ForerunGreen,
                    cursorColor = ForerunGreen
                )
            )

            Spacer(modifier = Modifier.height(Dimens.Space8))

            // Any Store Toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = stringResource(R.string.create_order_any_store_toggle),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = ForerunTextPrimary
                )
                Switch(
                    checked = item.anyStore,
                    onCheckedChange = onAnyStoreToggle,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = ForerunSurface,
                        checkedTrackColor = ForerunGreen
                    )
                )
            }

            // Custom Store Input (if not Any Store)
            if (!item.anyStore) {
                Spacer(modifier = Modifier.height(Dimens.Space8))
                OutlinedTextField(
                    value = item.customStoreName ?: "",
                    onValueChange = onCustomStoreChange,
                    label = { Text(stringResource(R.string.create_order_custom_store_label)) },
                    placeholder = { Text(stringResource(R.string.create_order_custom_store_hint), fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = ForerunGreen,
                        focusedLabelColor = ForerunGreen,
                        cursorColor = ForerunGreen
                    )
                )
            }
        }
    }
}

package com.forerun.customer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import android.util.Log
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import com.forerun.customer.core.network.ApiResponse
import com.forerun.customer.data.remote.api.AuthApi
import com.forerun.customer.data.remote.dto.auth.LoginRequest
import com.forerun.customer.ui.theme.*
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import com.forerun.customer.core.notification.NotificationPayloadParser
import com.forerun.customer.ui.navigation.ForerunNavGraph
import com.forerun.customer.ui.navigation.Routes
import kotlinx.coroutines.flow.MutableStateFlow
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var authApi: AuthApi

    @Inject
    lateinit var tokenRefreshManager: com.forerun.customer.data.remote.token.TokenRefreshManager

    private val pendingDeepLinkOrderId = MutableStateFlow<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = androidx.activity.SystemBarStyle.dark(
                android.graphics.Color.TRANSPARENT
            ),
            navigationBarStyle = androidx.activity.SystemBarStyle.dark(
                android.graphics.Color.TRANSPARENT
            )
        )
        super.onCreate(savedInstanceState)

        val initialOrderId = NotificationPayloadParser.extractOrderId(intent)
        if (!initialOrderId.isNullOrBlank()) {
            pendingDeepLinkOrderId.value = initialOrderId
        }

        setContent {
            ForerunTheme {
                val navController = rememberNavController()
                val pendingOrderId by pendingDeepLinkOrderId.collectAsStateWithLifecycle()

                // POST_NOTIFICATIONS permission request for Android 13+ (API 33+)
                val notificationPermissionLauncher = rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.RequestPermission()
                ) { isGranted ->
                    Log.d("MainActivity", "POST_NOTIFICATIONS granted: $isGranted")
                }

                LaunchedEffect(Unit) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        val permission = Manifest.permission.POST_NOTIFICATIONS
                        if (ContextCompat.checkSelfPermission(this@MainActivity, permission) != PackageManager.PERMISSION_GRANTED) {
                            notificationPermissionLauncher.launch(permission)
                        }
                    }
                }

                // Handle deep linking from notification payload
                LaunchedEffect(pendingOrderId) {
                    pendingOrderId?.let { orderId ->
                        navController.navigate(Routes.orderDetail(orderId)) {
                            launchSingleTop = true
                        }
                        pendingDeepLinkOrderId.value = null
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ForerunNavGraph(
                        navController = navController,
                        tokenRefreshManager = tokenRefreshManager
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val orderId = NotificationPayloadParser.extractOrderId(intent)
        if (!orderId.isNullOrBlank()) {
            pendingDeepLinkOrderId.value = orderId
        }
    }


    private fun testLogin() {
        lifecycleScope.launch {
            Log.d("ForerunAuthTest", "Initiating login test...")
            val response = authApi.login(
                LoginRequest(
                    whatsapp = "0900000000",
                    password = "testpassword"
                )
            )
            when (response) {
                is ApiResponse.Success -> {
                    val tokenPreview = response.data.accessToken.take(10)
                    Log.d("ForerunAuthTest", "Login SUCCESS: token received: $tokenPreview... user=${response.data.user.name}")
                }
                is ApiResponse.Error -> {
                    Log.d("ForerunAuthTest", "Login ERROR: code=${response.statusCode}, error=${response.error}, message=${response.message}")
                }
            }
        }
    }
}


@Composable
private fun DesignSystemPreview(
    onTestLoginClick: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(Dimens.ScreenMargin),
        verticalArrangement = Arrangement.spacedBy(Dimens.Space24)
    ) {
        // Header
        Text(
            text = stringResource(R.string.app_name),
            style = MaterialTheme.typography.displayLarge,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "FORERUN",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // Colors grid
        Text("Colors", style = MaterialTheme.typography.titleLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(Dimens.Space8)) {
            ColorSwatch("Primary", ForerunGreen)
            ColorSwatch("Dark", ForerunGreenDark)
            ColorSwatch("Light", ForerunGreenLight)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(Dimens.Space8)) {
            ColorSwatch("WhatsApp", WhatsAppGreen)
            ColorSwatch("Danger", ForerunDanger)
            ColorSwatch("Warning", ForerunWarning)
        }

        // Typography
        Text("Typography", style = MaterialTheme.typography.titleLarge)
        TypographySample("Display Large", MaterialTheme.typography.displayLarge)
        TypographySample("Headline Medium", MaterialTheme.typography.headlineMedium)
        TypographySample("Title Large", MaterialTheme.typography.titleLarge)
        TypographySample("Body Large", MaterialTheme.typography.bodyLarge)
        TypographySample("Body Medium", MaterialTheme.typography.bodyMedium)
        TypographySample("Label Medium", MaterialTheme.typography.labelMedium)

        // Buttons
        Text("Buttons", style = MaterialTheme.typography.titleLarge)
        Button(
            onClick = {},
            modifier = Modifier.fillMaxWidth().height(Dimens.ButtonHeightLarge),
            shape = RoundedCornerShape(Dimens.RadiusPill)
        ) {
            Text("Button Primary", style = MaterialTheme.typography.labelLarge)
        }
        OutlinedButton(
            onClick = {},
            modifier = Modifier.fillMaxWidth().height(Dimens.ButtonHeightLarge),
            shape = RoundedCornerShape(Dimens.RadiusPill)
        ) {
            Text("Button Outlined", style = MaterialTheme.typography.labelLarge)
        }

        // Temporary Test Login Button (Sprint 1.3)
        Button(
            onClick = onTestLoginClick,
            modifier = Modifier.fillMaxWidth().height(Dimens.ButtonHeightLarge),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
            shape = RoundedCornerShape(Dimens.RadiusPill)
        ) {
            Text("Test Login", style = MaterialTheme.typography.labelLarge)
        }


        Spacer(Modifier.height(Dimens.Space48))
    }
}

@Composable
private fun ColorSwatch(label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(Dimens.RadiusMedium))
                .background(color)
        )
        Spacer(Modifier.height(Dimens.Space4))
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun TypographySample(label: String, style: androidx.compose.ui.text.TextStyle) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("نموذج نص عربي - فَوْراً", style = style)
    }
}

@Preview(showBackground = true, widthDp = 360, heightDp = 800)
@Composable
private fun DesignSystemPreviewPreview() {
    ForerunTheme {
        DesignSystemPreview()
    }
}

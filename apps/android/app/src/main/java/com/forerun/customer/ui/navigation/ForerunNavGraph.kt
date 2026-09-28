package com.forerun.customer.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.forerun.customer.data.remote.token.TokenRefreshManager
import com.forerun.customer.ui.account.AccountScreen
import com.forerun.customer.ui.auth.login.LoginScreen
import com.forerun.customer.ui.auth.register.RegisterScreen
import com.forerun.customer.ui.auth.status.PendingVerificationScreen
import com.forerun.customer.ui.auth.status.SuspendedScreen
import com.forerun.customer.ui.home.HomeScreen
import com.forerun.customer.ui.onboarding.OnboardingScreen
import com.forerun.customer.ui.orders.OrdersScreen
import com.forerun.customer.ui.splash.SplashDestination
import com.forerun.customer.ui.splash.SplashScreen

object Routes {
    const val SPLASH = "splash"
    const val ONBOARDING = "onboarding"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val PENDING_VERIFICATION = "pending_verification"
    const val SUSPENDED = "suspended"
    const val HOME = "home"
    const val ORDERS = "orders"
    const val ACCOUNT = "account"
}

@Composable
fun ForerunNavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    startDestination: String = Routes.SPLASH,
    tokenRefreshManager: TokenRefreshManager? = null
) {
    if (tokenRefreshManager != null) {
        LaunchedEffect(tokenRefreshManager) {
            tokenRefreshManager.sessionExpiredEvent.collect {
                if (navController.currentDestination?.route != Routes.LOGIN) {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            }
        }
    }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val showBottomBar = currentRoute in setOf(Routes.HOME, Routes.ORDERS, Routes.ACCOUNT)

    Scaffold(
        modifier = modifier,
        bottomBar = {
            if (showBottomBar) {
                ForerunBottomNavBar(
                    currentRoute = currentRoute,
                    onNavigateToRoute = { route ->
                        navController.navigate(route) {
                            popUpTo(Routes.HOME) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
        composable(Routes.SPLASH) {
            SplashScreen(
                onNavigate = { destination ->
                    val targetRoute = when (destination) {
                        SplashDestination.Onboarding -> Routes.ONBOARDING
                        SplashDestination.Login -> Routes.LOGIN
                        SplashDestination.Home -> Routes.HOME
                        SplashDestination.PendingVerification -> Routes.PENDING_VERIFICATION
                        SplashDestination.Suspended -> Routes.SUSPENDED
                    }
                    navController.navigate(targetRoute) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.ONBOARDING) {
            OnboardingScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.LOGIN) {
            LoginScreen(
                onNavigateToHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToPending = {
                    navController.navigate(Routes.PENDING_VERIFICATION) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToSuspended = {
                    navController.navigate(Routes.SUSPENDED) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Routes.REGISTER)
                }
            )
        }
        composable(Routes.REGISTER) {
            RegisterScreen(
                onNavigateToPending = {
                    navController.navigate(Routes.PENDING_VERIFICATION) {
                        popUpTo(Routes.LOGIN) { inclusive = false }
                    }
                },
                onNavigateToLogin = {
                    navController.popBackStack()
                }
            )
        }
        composable(Routes.PENDING_VERIFICATION) {
            PendingVerificationScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.SUSPENDED) {
            SuspendedScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.HOME) {
            HomeScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.ORDERS) {
            OrdersScreen()
        }
        composable(Routes.ACCOUNT) {
            AccountScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
}

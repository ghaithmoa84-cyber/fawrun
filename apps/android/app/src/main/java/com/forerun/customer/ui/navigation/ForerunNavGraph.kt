package com.forerun.customer.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable

object Routes {
    const val SPLASH = "splash"
    const val ONBOARDING = "onboarding"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val PENDING_VERIFICATION = "pending_verification"
    const val SUSPENDED = "suspended"
    const val HOME = "home"
}

@Composable
fun ForerunNavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    startDestination: String = Routes.SPLASH
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Routes.SPLASH) {
            com.forerun.customer.ui.splash.SplashScreen(
                onNavigate = { destination ->
                    val targetRoute = when (destination) {
                        com.forerun.customer.ui.splash.SplashDestination.Onboarding -> Routes.ONBOARDING
                        com.forerun.customer.ui.splash.SplashDestination.Login -> Routes.LOGIN
                        com.forerun.customer.ui.splash.SplashDestination.Home -> Routes.HOME
                        com.forerun.customer.ui.splash.SplashDestination.PendingVerification -> Routes.PENDING_VERIFICATION
                        com.forerun.customer.ui.splash.SplashDestination.Suspended -> Routes.SUSPENDED
                    }
                    navController.navigate(targetRoute) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.ONBOARDING) {
            com.forerun.customer.ui.onboarding.OnboardingScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.LOGIN) {
            com.forerun.customer.ui.auth.login.LoginScreen(
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
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Register Stub")
            }
        }
        composable(Routes.PENDING_VERIFICATION) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Pending Verification Stub")
            }
        }
        composable(Routes.SUSPENDED) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Suspended Stub")
            }
        }
        composable(Routes.HOME) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Home Stub")
            }
        }
    }
}

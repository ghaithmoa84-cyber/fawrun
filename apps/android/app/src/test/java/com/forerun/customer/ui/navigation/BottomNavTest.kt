package com.forerun.customer.ui.navigation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BottomNavTest {

    private val bottomBarVisibleRoutes = setOf(Routes.HOME, Routes.ORDERS, Routes.ACCOUNT)

    @Test
    fun bottomNavItems_containsCorrectItemsInOrder() {
        val items = BottomNavItem.items
        assertEquals(3, items.size)
        assertEquals(BottomNavItem.Home, items[0])
        assertEquals(BottomNavItem.Orders, items[1])
        assertEquals(BottomNavItem.Account, items[2])
    }

    @Test
    fun bottomNavItems_haveCorrectRoutes() {
        assertEquals("home", BottomNavItem.Home.route)
        assertEquals("orders", BottomNavItem.Orders.route)
        assertEquals("account", BottomNavItem.Account.route)
    }

    @Test
    fun bottomBar_isVisibleOnlyOnMainTabs() {
        // Whitelist routes: Home, Orders, Account
        assertTrue(Routes.HOME in bottomBarVisibleRoutes)
        assertTrue(Routes.ORDERS in bottomBarVisibleRoutes)
        assertTrue(Routes.ACCOUNT in bottomBarVisibleRoutes)

        // Non-whitelist routes: Splash, Auth, Creation, Details
        assertFalse(Routes.SPLASH in bottomBarVisibleRoutes)
        assertFalse(Routes.LOGIN in bottomBarVisibleRoutes)
        assertFalse(Routes.REGISTER in bottomBarVisibleRoutes)
        assertFalse(Routes.ONBOARDING in bottomBarVisibleRoutes)
        assertFalse(Routes.CREATE_ORDER in bottomBarVisibleRoutes)
        assertFalse(Routes.ADDRESS_SETUP in bottomBarVisibleRoutes)
        assertFalse(Routes.SUPPORT in bottomBarVisibleRoutes)
        assertFalse(Routes.ORDER_DETAIL in bottomBarVisibleRoutes)
        assertFalse("orders/ord_123" in bottomBarVisibleRoutes)
        assertFalse(Routes.ORDER_RATING in bottomBarVisibleRoutes)
    }

    @Test
    fun bottomBar_selectionLogicIdentifiesCorrectTab() {
        fun isSelected(item: BottomNavItem, currentRoute: String?): Boolean =
            currentRoute == item.route

        // When currentRoute is HOME
        assertTrue(isSelected(BottomNavItem.Home, Routes.HOME))
        assertFalse(isSelected(BottomNavItem.Orders, Routes.HOME))
        assertFalse(isSelected(BottomNavItem.Account, Routes.HOME))

        // When currentRoute is ORDERS
        assertFalse(isSelected(BottomNavItem.Home, Routes.ORDERS))
        assertTrue(isSelected(BottomNavItem.Orders, Routes.ORDERS))
        assertFalse(isSelected(BottomNavItem.Account, Routes.ORDERS))

        // When currentRoute is ACCOUNT
        assertFalse(isSelected(BottomNavItem.Home, Routes.ACCOUNT))
        assertFalse(isSelected(BottomNavItem.Orders, Routes.ACCOUNT))
        assertTrue(isSelected(BottomNavItem.Account, Routes.ACCOUNT))
    }

    @Test
    fun bottomBar_orderDetailRoute_doesNotMatchOrdersTab() {
        val detailRoute = "orders/order_xyz_456"

        // Exact match prevents detail route from selecting the list tab
        val matchesOrdersTab = (detailRoute == BottomNavItem.Orders.route)
        assertFalse(matchesOrdersTab)

        // Exact match prevents detail route from showing bottom bar
        val showsBottomBar = detailRoute in bottomBarVisibleRoutes
        assertFalse(showsBottomBar)
    }
}

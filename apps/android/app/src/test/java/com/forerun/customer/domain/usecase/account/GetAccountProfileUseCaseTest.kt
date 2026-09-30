package com.forerun.customer.domain.usecase.account

import com.forerun.customer.data.FakeAccountRepository
import com.forerun.customer.domain.model.CustomerProfile
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GetAccountProfileUseCaseTest {

    private val repository = FakeAccountRepository()
    private val useCase = GetAccountProfileUseCase(repository)

    @Test
    fun invoke_success_returnsProfileFromRepository() = runTest {
        repository.profile = CustomerProfile(
            id = "c1",
            name = "عمر",
            whatsapp = "0988888888",
            altPhone = null,
            status = "VERIFIED",
            completedOrders = 12,
            totalFeesPaid = 60000
        )

        val result = useCase()

        assertTrue(result.isSuccess)
        assertEquals("c1", result.getOrNull()?.id)
        assertEquals("عمر", result.getOrNull()?.name)
        assertNull(result.getOrNull()?.altPhone)
        assertEquals(12, result.getOrNull()?.completedOrders)
    }

    @Test
    fun invoke_failure_returnsFailureWithSameMessage() = runTest {
        repository.getProfileError = "فشل الاتصال بالخادم"

        val result = useCase()

        assertTrue(result.isFailure)
        assertEquals("فشل الاتصال بالخادم", result.exceptionOrNull()?.message)
    }
}

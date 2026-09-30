package com.forerun.customer.domain.usecase.account

import com.forerun.customer.data.FakeAccountRepository
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdateAccountProfileUseCaseTest {

    private val repository = FakeAccountRepository()
    private val useCase = UpdateAccountProfileUseCase(repository)

    @Test
    fun invoke_success_returnsUpdatedProfile() = runTest {
        val result = useCase(name = "أحمد خالد", altPhone = "0987654321")

        assertTrue(result.isSuccess)
        assertEquals("أحمد خالد", result.getOrNull()?.name)
        assertEquals("0987654321", result.getOrNull()?.altPhone)
    }

    @Test
    fun invoke_failure_returnsFailureWithSameMessage() = runTest {
        repository.updateProfileError = "خطأ في تحديث الملف"

        val result = useCase(name = "أحمد خالد", altPhone = null)

        assertTrue(result.isFailure)
        assertEquals("خطأ في تحديث الملف", result.exceptionOrNull()?.message)
    }

    @Test
    fun invoke_passesNameAndAltPhone_unchangedToRepository() = runTest {
        useCase(name = "أحمد خالد", altPhone = "0987654321")
        assertEquals("أحمد خالد", repository.lastUpdatedName)
        assertEquals("0987654321", repository.lastUpdatedAltPhone)

        useCase(name = "سارة", altPhone = null)
        assertEquals("سارة", repository.lastUpdatedName)
        assertNull(repository.lastUpdatedAltPhone)
        assertEquals(2, repository.updateProfileCallCount)
    }
}

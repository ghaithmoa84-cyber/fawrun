package com.forerun.customer.domain.usecase.account

import com.forerun.customer.data.FakeAccountRepository
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ChangeAccountPasswordUseCaseTest {

    private val repository = FakeAccountRepository()
    private val useCase = ChangeAccountPasswordUseCase(repository)

    @Test
    fun invoke_success_returnsUnit() = runTest {
        val result = useCase(password = "newPassword123")

        assertTrue(result.isSuccess)
        assertEquals(Unit, result.getOrNull())
    }

    @Test
    fun invoke_failure_returnsFailureWithSameMessage() = runTest {
        repository.changePasswordError = "خطأ في تغيير كلمة المرور"

        val result = useCase(password = "newPassword123")

        assertTrue(result.isFailure)
        assertEquals("خطأ في تغيير كلمة المرور", result.exceptionOrNull()?.message)
        assertEquals(1, repository.changePasswordCallCount)
    }

    @Test
    fun invoke_passesPassword_unchangedToRepository() = runTest {
        useCase(password = "كلمة المرور ١٢٣")

        assertEquals("كلمة المرور ١٢٣", repository.lastChangedPassword)
        assertEquals(1, repository.changePasswordCallCount)
    }
}

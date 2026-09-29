package com.forerun.customer.ui.support

import androidx.lifecycle.ViewModel
import com.forerun.customer.core.config.AppConfig
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class FaqItem(
    val id: Int,
    val question: String,
    val answer: String,
    val isExpanded: Boolean = false
)

data class SupportUiState(
    val adminPhone: String = AppConfig.ADMIN_WHATSAPP_DISPLAY,
    val faqs: List<FaqItem> = emptyList()
)

@HiltViewModel
class SupportViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(SupportUiState(faqs = defaultFaqs))
    val uiState: StateFlow<SupportUiState> = _uiState.asStateFlow()

    fun toggleFaq(id: Int) {
        val currentFaqs = _uiState.value.faqs
        val updatedFaqs = currentFaqs.map { faq ->
            if (faq.id == id) faq.copy(isExpanded = !faq.isExpanded) else faq
        }
        _uiState.value = _uiState.value.copy(faqs = updatedFaqs)
    }

    fun getWhatsAppUrl(customMessage: String? = null): String {
        val message = customMessage ?: "مرحباً إدارة فَوْراً، أحتاج إلى مساعدة واستفسار بخصوص التطبيق."
        return AppConfig.buildWhatsAppUrl(message)
    }

    companion object {
        val defaultFaqs = listOf(
            FaqItem(
                id = 1,
                question = "كيف يعمل تطبيق فَوْراً في القنجرة؟",
                answer = "تطبيق فَوْراً هو منصتك المحلية للطلب السريع في القنجرة. تطلب ما تحتاجه من بقالة أو أغراض، ويتولى الكابتن شراءها من المحلات المتاحة وتوصيلها حتى باب منزلك مع تتبع مباشر لحالة الطلب."
            ),
            FaqItem(
                id = 2,
                question = "كيف يتم احتساب رسوم التوصيل؟",
                answer = "رسوم التوصيل ثابتة وشفافة تبدأ من الرسم الأساسي (5,000 ل.س). في حال الشراء من متاجر متعددة يضاف رسم لكل متجر إضافي، كما يضاف رسم للمناطق الطرفية البعيدة، وتظهر لك الرسوم المحتسبة في تفاصيل الطلب."
            ),
            FaqItem(
                id = 3,
                question = "كيف أتواصل مع الكابتن المسؤول عن طلبي؟",
                answer = "بمجرد قبول وتعيين كابتن لطلبك، ستظهر لك بطاقة الكابتن في شاشة تفاصيل الطلب، وبإمكانك التواصل معه مباشرة عبر الواتساب أو الاتصال الهاتفي بضغطة زر واحدة."
            ),
            FaqItem(
                id = 4,
                question = "هل يمكنني تعديل أو إلغاء الطلب بعد إرساله؟",
                answer = "يمكنك إلغاء الطلب مباشرة عبر زر إلغاء الطلب ما دام الطلب في مرحلة 'المراجعة والتدقيق'. بعد بدء الكابتن بعملية الشراء لا يمكن الإلغاء آلياً ولكن يمكنك التواصل مباشرة مع الإدارة."
            ),
            FaqItem(
                id = 5,
                question = "ما هي أوقات وساعات العمل المتاحة؟",
                answer = "خدمة فَوْراً والكباتن متاحون يومياً من الساعة 8:00 صباحاً وحتى 12:00 منتصف الليل لتلبية كافة طلباتكم."
            )
        )
    }
}

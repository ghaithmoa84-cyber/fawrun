# FORERUN Android — Production Release Checklist & Runbook

هذا المستند يشرح خطوات تجهيز، توقيع، بناء، وتوزيع حزم الإنتاج (Release APK / AAB) لتطبيق **FORERUN Customer**.

---

## 1. توليد مفتاح التوقيع (Generate Keystore)

يتم توليد ملف الـ Keystore باستخدام أداة `keytool` المرفقة مع الـ JDK:

```bash
keytool -genkey -v -keystore apps/android/forerun-release.jks \
  -alias forerun_release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS
```

### المتطلبات والأسئلة أثناء التوليد:
- **Keystore Password:** اختر كلمة مرور قوية واحتفظ بها في مكان آمن.
- **Key Password:** يفضل أن تكون نفس كلمة المرور أو كلمة مرور مخصصة.
- **First and Last Name:** `FORERUN Team` أو اسم المؤسسة.
- **Organizational Unit / Organization:** `FORERUN Mobile Team`.
- **City / State / Country:** تفاصيل الموقع الجغرافي (مثلاً `SY`).

> ⚠️ **تحذير أمني صارم:**  
> - لا تقم أبداً برفع ملف `.jks` أو `keystore.properties` إلى Git (تم استثناؤهما في `.gitignore`).  
> - احتفظ بنسخة احتياطية مشفرة من الـ Keystore وكلمات المرور في مدير كلمات مرور آمن (مثل 1Password أو Bitwarden). فقدان المفتاح يعني عدم القدرة على تحديث التطبيق لدى المستخدمين نهائياً!

---

## 2. إعداد ملف `keystore.properties`

1. انسخ ملف النموذج `keystore.properties.example` إلى `keystore.properties`:
   ```bash
   cp apps/android/keystore.properties.example apps/android/keystore.properties
   ```
   *(أو وضعه داخل `apps/android/app/keystore.properties`)*

2. عدّل القيم داخل الملف:
   ```properties
   storeFile=forerun-release.jks
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=forerun_release
   keyPassword=YOUR_KEY_PASSWORD
   ```

---

## 3. تحديث رقم الإصدار (Versioning)

قبل كل إصدار جديد، قم بتحديث `versionCode` و `versionName` في `apps/android/app/build.gradle.kts`:

```kotlin
    defaultConfig {
        applicationId = "com.forerun.customer"
        minSdk = 26
        targetSdk = 35
        versionCode = 1        // ⬅️ زيادة بمقدار 1 مع كل بناء جديد (Integer متصاعد)
        versionName = "1.0.0"  // ⬅️ رقم الإصدار الدلالي للمستخدم (Semantic Versioning)
        ...
    }
```

### معايير الترقيم (Semantic Versioning):
- **Patch (0.1.x):** إصلاحات أخطاء سريعة (Bug fixes).
- **Minor (0.x.0):** ميزات جديدة دون كسر التوافقية (New features).
- **Major (x.0.0):** إطلاق رسمي رئيسي أو تغييرات جذرية (Production launch).

---

## 4. فحص الجودة المسبق (Pre-Release Quality Gate)

قبل تشغيل بناء الإنتاج، تأكد من اجتياز جميع الاختبارات وفحص الكود:

```bash
cd apps/android
./gradlew clean lint test assembleDebug
```

المعايير المطلوبة:
- ✅ Unit Tests: بنسبة نجاح 100% (152+ test).
- ✅ Lint: خلو كامل من الأخطاء (0 Errors).
- ✅ Debug APK: بناء ناجح بدون تحذيرات تعيق العمل.

---

## 5. بناء حزم الإنتاج الموقعة (Build Release APK)

بعد إعداد `keystore.properties` وملف الـ `.jks`:

### لبناء ملفات APK مقسمة حسب المعمارية (ABI Splits):
```bash
cd apps/android
./gradlew assembleRelease
```

المخرجات ستكون في:
```
apps/android/app/build/outputs/apk/release/
├── app-arm64-v8a-release.apk      (للأجهزة الحديثة 64-bit — الحجم الأمثل ~20-25MB)
├── app-armeabi-v7a-release.apk    (للأجهزة الأقدم 32-bit)
└── app-x86_64-release.apk         (للمحاكيات وأجهزة x86_64)
```

### لبناء حزمة Google Play (Android App Bundle - AAB):
```bash
./gradlew bundleRelease
```
المخرجات:
```
apps/android/app/build/outputs/bundle/release/app-release.aab
```

---

## 6. التحقق من توقيع وحجم الـ APK

تحقق من صحة التوقيع عبر `apksigner` (المرفق مع Android SDK Build-Tools):

```bash
apksigner verify --verbose apps/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```
النتيجة المتوقعة:
```
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
```

تأكد أيضاً من تفعيل ميزات الحماية والتقليص (R8 / ProGuard):
- `isMinifyEnabled = true` مفعّل لحماية الكود من الهندسة العكسية.
- `isShrinkResources = true` مفعّل لإزالة الموارد غير المستخدمة وتصغير حجم التطبيق.

---

## 7. آلية توزيع الـ APK للمستخدمين (Distribution)

### الخيار 1: التوزيع المباشر (Direct Sideload / WhatsApp / Website)
1. اختر الحزمة `app-arm64-v8a-release.apk` لمعظم الهواتف الحديثة (أو حزمة مجمعة).
2. قم برفع الحزمة إلى خادم التحميل المباشر أو توزيعها عبر رابط تليغرام/واتساب مخصص للمختبرين الداخليين.

### الخيار 2: Google Play Console
1. استخدم حزمة `bundleRelease` (`app-release.aab`).
2. قم برفع الحزمة إلى مسار الاختبار المغلق (Internal Testing) في متجر Play.
3. راجع الـ Release Notes وتأكد من تفعيل فحص Google Play Protect.

---

## 8. قائمة المراجعة النهائية (Pre-Flight Checklist)

- [ ] التأكد من أن `NetworkModule.BASE_URL` يشير إلى سيرفر الإنتاج.
- [ ] التأكد من أن زر أدوات التطوير (Debug Tools) محمي بـ `BuildConfig.DEBUG`.
- [ ] التأكد من عدم وجود أي نصوص وهمية أو TODO في واجهات المستخدم.
- [ ] التأكد من وجود ملف `google-services.json` الخاص ببيئة الإنتاج (FCM).
- [ ] زيادة `versionCode` وتحديث `versionName`.
- [ ] التأكد من اجتياز `./gradlew clean lint test assembleDebug`.
- [ ] بناء الحزمة وتوقيعها بنجاح بواسطة `keystore.properties`.

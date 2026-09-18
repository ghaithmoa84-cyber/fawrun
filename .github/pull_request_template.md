## وصف التغيير
<!-- اشرح ما الذي تغيّر ولماذا -->

## نوع التغيير
- [ ] feat: ميزة جديدة
- [ ] fix: إصلاح خطأ
- [ ] refactor: إعادة هيكلة بدون تغيير سلوك
- [ ] docs: توثيق فقط
- [ ] test: اختبارات فقط

## أمر التحقق
```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm --filter fawrun-api test
```
النتيجة: [ ] نجح

## Checklist — Dead Ends
- [ ] كل `async` function ترجع نتيجة صريحة أو `throw` — لا `return` صامت
- [ ] كل `catch` يسجل الخطأ على الأقل — لا `void 0` بدون `logger`
- [ ] كل `switch` / `if-else` على enum أو status يغطي جميع الحالات أو له `default: throw`
- [ ] لا استدعاء لـ `findUnique` بدون معالجة حالة `null`

## Checklist — Edge Cases
- [ ] مدخلات حدية مختبرة: `null`، `[]`، `""`، أرقام سالبة
- [ ] `findUnique` → `null` معالج في كل مكان
- [ ] العمليات المتزامنة محمية: `updateMany` مع `where: { status: currentStatus }`
- [ ] العمليات التي تُرسل مرتين آمنة (Idempotency)

## Checklist — Business Rules
- [ ] كل تغيير status يمر عبر State Machine حصراً
- [ ] كل عملية مالية داخل transaction + LedgerEntry
- [ ] كل عملية مركبة داخل `prisma.$transaction` واحدة
- [ ] AuditLog مسجل لكل حدث
- [ ] Ownership check: المستخدم يملك المورد (customerId / runnerId)

## Checklist — Security
- [ ] كل endpoint له Guard مناسب (Role + Verified)
- [ ] Ownership check موجود (المستخدم يملك المورد)
- [ ] كل input مُتحقق منه بـ Zod (body, query, params)
- [ ] لا بيانات حساسة في الـ response
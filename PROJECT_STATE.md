# FAWRUN Project State
**Date:** 2026-09-16

## ما هو مؤكد ومستقر

### Sprint 1 — مدموج في master
- Auth: register, login, refresh, logout
- JWT RS256 + Refresh Token revocable
- Admin: إدارة المستخدمين والمندوبين
- WebSocket Gateway: /orders و /admin
- Prisma Schema: 15 model، migration مطبقة
- 87 اختبار ناجح

### Sprint 2 — branch: feature/sprint-2-order-core
**منجز ومتحقق منه:**
- Order State Machine: 23 انتقال، 44 اختبار
- OrderStore State Machine: 15 اختبار
- Runner State Machine: 28 اختبار (موجودة، غير محقونة في services بعد)
- POST /customer/orders مع orderNumber generation
- GET/DELETE /customer/orders
- GET/PUT /customer/me و /customer/me/address
- Admin: approve, reject, assign-runner, cancel, start-review
- Pricing Engine: calculateFee() من shared-constants
- LedgerService: موجود (scaffold)، لا يُستدعى بعد
- 148 اختبار ناجح، build نظيف

## ما هو غير مؤكد أو يحتاج مراجعة
- orders.service.ts: 1200+ سطر، يحتاج تقسيم في Sprint 3
- RunnerStateMachine موجودة لكن غير مُحقنة في أي service
- recalculateFee() موجودة لكن لا تُستدعى
- WebSocket لا يتحقق من user.status عند الاتصال
- Refresh token لا يُدار (rotation غير مطبق)

## ما لم يُبنَ بعد (Sprint 3+)
- Runner endpoints: start, deliver, purchase-store, skip-store
- LedgerEntry creation عند DELIVERED
- Receipt upload (Cloudflare R2)
- Settlement module
- Rating module
- Admin Dashboard (Next.js)
- Runner PWA (React)
- Android App (Kotlin)

## الفجوات المؤجلة بقرار
- Outbox pattern: مؤجل لما بعد MVP
- Refresh token rotation: Sprint 3
- WhatsApp E.164 validation: Sprint 3

# Sprint 1 — Foundation (أسبوعان)

## الهدف العام

تأسيس البنية التحتية الكاملة للمشروع: إعداد Monorepo، هيكل NestJS الأساسي، نموذج البيانات في PostgreSQL عبر Prisma، نظام المصادقة الكامل (تسجيل، دخول، تجديد تلقائي، خروج)، آلية التحقق اليدوي عبر WhatsApp، بوابة WebSocket أساسية، وإدارة المستخدمين من لوحة الإدارة مع تفعيل الحسابات.

---

## المهام الفرعية

---

### 1.1 إعداد Monorepo (pnpm + Turborepo)

**الوصف:**
تهيئة بنية Monorepo الكاملة وفق الهيكل المحدد في الوثيقة (القسم 3). يجب أن يحتوي المشروع على المجلدات التالية:

```
fawrun/
├── apps/
│   ├── api/                        ← NestJS Backend
│   ├── admin-web/                  ← Next.js (App Router)
│   ├── runner-pwa/                 ← React + Vite (PWA)
│   └── android/                    ← Kotlin (Native Android)
├── packages/
│   ├── shared-types/               ← DTOs + Zod Schemas مشتركة
│   └── shared-constants/           ← ثوابت مشتركة
└── docs/
```

**خطوات التنفيذ التفصيلية:**

1. التأكد من وجود `pnpm` مثبتاً على النظام. إذا لم يكن موجوداً: `npm install -g pnpm`.
2. إنشاء ملف `pnpm-workspace.yaml` في جذر المشروع بالمحتوى:
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```
3. إنشاء `package.json` في جذر المشروع يتضمن:
   - `name`: `"fawrun"`
   - `private`: `true`
   - `packageManager`: إصدار pnpm المستخدم
   - `scripts` تشمل: `dev`, `build`, `lint`, `test` (تعمل عبر Turborepo)
   - `devDependencies` تشمل: `turbo`
4. إنشاء ملف `turbo.json` في جذر المشروع يحتوي على pipeline يحدد:
   - `build`: يعتمد على `^build` (بناء التبعيات أولاً)
   - `dev`: بدون cache
   - `lint`: بدون تبعيات
   - `test`: بدون تبعيات
5. إنشاء ملف `tsconfig.json` في جذر المشروع كـ base config مشترك يتضمن:
   - `compilerOptions`: `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`, `resolveJsonModule: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`
6. إنشاء ملف `.gitignore` يشمل: `node_modules/`, `dist/`, `.env`, `.env.*`, `.turbo/`, `*.tsbuildinfo`
7. إنشاء المجلدات الفرعية الفارغة: `apps/api/`, `apps/admin-web/`, `apps/runner-pwa/`, `apps/android/`, `packages/shared-types/`, `packages/shared-constants/`, `docs/`
8. تشغيل `pnpm install` للتحقق من صحة الإعداد.

**المخرج المتوقع:**
- ملفات: `pnpm-workspace.yaml`, `package.json`, `turbo.json`, `tsconfig.json`, `.gitignore`
- هيكل المجلدات الكامل جاهز
- `pnpm install` يعمل بدون أخطاء

**الاعتماديات:** لا يوجد — مهمة تأسيسية.

---

### 1.2 إعداد حزمة shared-constants

**الوصف:**
إنشاء حزمة `packages/shared-constants` التي تحتوي على الثوابت المشتركة بين Backend وجميع الـ Frontends. تتضمن ثوابت التسعير وحالات الطلب والإعدادات العامة.

**خطوات التنفيذ التفصيلية:**

1. إنشاء `packages/shared-constants/package.json`:
   - `name`: `"@fawrun/shared-constants"`
   - `version`: `"0.0.1"`
   - `main`: `"./dist/index.js"`
   - `types`: `"./dist/index.d.ts"`
   - `scripts`: `build`, `dev` (tsc --watch)
2. إنشاء `packages/shared-constants/tsconfig.json` يمتد من tsconfig الجذر.
3. إنشاء الملفات التالية:

**`src/order-status.ts`:**
```typescript
export const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'UNDER_REVIEW',
  'AWAITING_RUNNER',
  'AWAITING_PREFERRED_RUNNER',
  'ASSIGNED',
  'IN_PROGRESS',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];
```

**`src/pricing.ts`:**
```typescript
export const PRICING = {
  BASE_FEE: 60,
  PERIPHERAL_FEE: 40,
  EXTRA_STORE_FEE: 20,
  RUNNER_SHARE: 0.75,
  PLATFORM_SHARE: 0.25,
} as const;

export function calculateFee(params: {
  isPeripheral: boolean;
  purchasedStoreCount: number;
}): {
  baseFee: number;
  peripheralFee: number;
  extraStoresFee: number;
  totalFee: number;
  runnerShare: number;
  platformShare: number;
} {
  const baseFee = PRICING.BASE_FEE;
  const peripheralFee = params.isPeripheral ? PRICING.PERIPHERAL_FEE : 0;
  const extraStoresFee =
    Math.max(0, params.purchasedStoreCount - 1) * PRICING.EXTRA_STORE_FEE;
  const totalFee = baseFee + peripheralFee + extraStoresFee;

  return {
    baseFee,
    peripheralFee,
    extraStoresFee,
    totalFee,
    runnerShare: Math.floor(totalFee * PRICING.RUNNER_SHARE),
    platformShare: Math.ceil(totalFee * PRICING.PLATFORM_SHARE),
  };
}
```

**`src/config.ts`:**
```typescript
export const CONFIG = {
  ACCESS_TOKEN_EXPIRY: '2h',
  BCRYPT_ROUNDS: 12,
  MAX_RECEIPT_SIZE_MB: 5,
  MAX_RECEIPTS_PER_STORE: 5,
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png'],
  PRESIGNED_URL_EXPIRY_SECONDS: 300,
  RATING_EDIT_WINDOW_HOURS: 24,
  RATE_LIMIT_LOGIN: { max: 10, windowMinutes: 15 },
  RATE_LIMIT_REGISTER: { max: 3, windowMinutes: 60 },
  RATE_LIMIT_GENERAL: { max: 100, windowMinutes: 1 },
  PAGINATION_DEFAULT_LIMIT: 20,
  PAGINATION_MAX_LIMIT: 100,
  ORDER_NUMBER_PREFIX: 'FW',
  ORDER_NUMBER_PAD_LENGTH: 6,
  DAMASCUS_TIMEZONE: 'Asia/Damascus',
} as const;
```

4. إنشاء `src/index.ts` يُعيد تصدير كل الملفات أعلاه.

**المخرج المتوقع:**
- حزمة `@fawrun/shared-constants` كاملة مع ملفات: `order-status.ts`, `pricing.ts`, `config.ts`, `index.ts`
- `pnpm build` يعمل بدون أخطاء في الحزمة

**الاعتماديات:** المهمة 1.1

---

### 1.3 إعداد حزمة shared-types

**الوصف:**
إنشاء حزمة `packages/shared-types` التي تحتوي على DTOs وZod Schemas المشتركة بين Backend والـ Frontends.

**خطوات التنفيذ التفصيلية:**

1. إنشاء `packages/shared-types/package.json`:
   - `name`: `"@fawrun/shared-types"`
   - `version`: `"0.0.1"`
   - `dependencies`: `zod`
   - `main`, `types`, `scripts` مشابهة لـ shared-constants
2. إنشاء `packages/shared-types/tsconfig.json`.
3. إنشاء الملفات التالية:

**`src/auth.types.ts`:**
- Zod schema + TypeScript type لـ `RegisterRequest`: `name` (string, min 2), `whatsapp` (string), `altPhone` (string nullable), `password` (string, min 8), `address` (object: `lat` number, `lng` number, `description` string)
- Zod schema + type لـ `LoginRequest`: `whatsapp` (string), `password` (string)
- Zod schema + type لـ `RefreshRequest`: `refreshToken` (string)
- Type لـ `LoginResponse`: `accessToken`, `refreshToken`, `user` (object: `id`, `name`, `role`: `'CUSTOMER' | 'RUNNER' | 'ADMIN'`, `status`)
- Type لـ `ErrorResponse`: `statusCode` (number), `error` (string), `message` (string)

**`src/order.types.ts`:**
- Zod schema + type لـ `CreateOrderRequest`: `items` (array of `{ itemName: string, quantity: string, customStoreName: string | null, anyStore: boolean }`), `notes` (string nullable), `preferredRunnerId` (string nullable), `waitForPreferred` (boolean), `deliveryAddress` (object: `lat`, `lng`, `description`)
- Type لـ `CreateOrderResponse`: `id`, `orderNumber`, `status`, `estimatedFee` (object: `baseFee`, `peripheralFee`, `extraStoresFee`, `totalFee`, `note`)
- Type لـ `PaginatedResponse<T>`: `data: T[]`, `meta: { total, page, limit, totalPages }`

**`src/runner.types.ts`:**
- Type لـ `RunnerStatusUpdate`: `status`: `'AVAILABLE' | 'UNAVAILABLE'`
- Type لـ `PurchaseResponse`: `orderStore` (object), `updatedFee` (object), `customerNotified` (boolean)
- Type لـ `ApproveOrderRequest`: `isPeripheral` (boolean), `notes` (string nullable)
- Type لـ `AssignRunnerRequest`: `runnerId` (string)

**`src/settlement.types.ts`:**
- Type لـ `CloseSettlementRequest`: `operationalDate` (string, format YYYY-MM-DD), `notes` (string nullable)

**`src/websocket.events.ts`:**
- تعريف أسماء أحداث WebSocket كثوابت:
  - أحداث العميل: `order:status_changed`, `order:runner_assigned`, `order:fee_updated`, `order:store_purchased`, `order:out_for_delivery`, `order:delivered`, `order:cancelled`, `account:verified`
  - أحداث Runner: `order:assigned`, `order:reassigned`, `order:assignment_cancelled`
  - أحداث Admin: `order:new`, `order:status_changed`, `order:needs_attention`, `user:new_registration`, `settlement:reminder`
- تعريف Types لـ payloads كل حدث وفق ما ورد في القسم 10

4. إنشاء `src/index.ts` يُعيد تصدير كل الملفات.

**المخرج المتوقع:**
- حزمة `@fawrun/shared-types` كاملة مع جميع الملفات المذكورة
- جميع Zod schemas صالحة ومتوافقة مع الـ Types
- `pnpm build` يعمل بدون أخطاء

**الاعتماديات:** المهمة 1.1

---

### 1.4 إعداد NestJS Skeleton + Prisma Schema + أول Migration

**الوصف:**
إنشاء تطبيق NestJS في `apps/api/` مع إعداد Prisma ORM وكتابة Schema كامل وفق القسم 5 من الوثيقة، ثم تنفيذ أول migration.

**خطوات التنفيذ التفصيلية:**

1. إنشاء مشروع NestJS في `apps/api/`:
   - `npx -y @nestjs/cli new . --package-manager pnpm --skip-git --strict`
   - أو إنشاء الهيكل يدوياً مع تثبيت التبعيات: `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/config`, `reflect-metadata`, `rxjs`
2. تثبيت تبعيات إضافية:
   - `prisma` و `@prisma/client`
   - `@nestjs/websockets` و `@nestjs/platform-socket.io` و `socket.io`
   - `bcrypt` و `@types/bcrypt`
   - `@nestjs/jwt` و `jsonwebtoken`
   - `zod`
   - `helmet`
   - `@nestjs/throttler` (Rate Limiting)
   - `@nestjs/schedule` و `cron` (للـ Cron Jobs)
   - `@sentry/nestjs` أو `@sentry/node`
   - `@aws-sdk/client-s3` (للـ Cloudflare R2 — متوافق مع S3 API)
3. إنشاء هيكل المجلدات داخل `apps/api/src/`:
   ```
   src/
   ├── modules/
   │   ├── auth/
   │   ├── users/
   │   ├── customers/
   │   ├── runners/
   │   ├── orders/
   │   ├── order-items/
   │   ├── order-stores/
   │   ├── pricing/
   │   ├── settlements/
   │   ├── ledger/
   │   ├── ratings/
   │   ├── receipts/
   │   ├── notifications/
   │   └── audit/
   ├── websocket/
   │   └── gateways/
   ├── state-machine/
   ├── common/
   │   ├── guards/
   │   ├── decorators/
   │   ├── filters/
   │   └── interceptors/
   ├── database/
   │   └── prisma.service.ts
   └── config/
   ```
4. إنشاء `apps/api/src/database/prisma.service.ts`:
   ```typescript
   import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
   import { PrismaClient } from '@prisma/client';

   @Injectable()
   export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
     async onModuleInit() {
       await this.$connect();
     }
     async onModuleDestroy() {
       await this.$disconnect();
     }
   }
   ```
5. إنشاء `apps/api/prisma/schema.prisma` بالمحتوى الكامل الوارد في القسم 5 من الوثيقة (انسخ الـ schema حرفياً من القسم 5 — لا تُعدّل ولا تُبسّط). يشمل:
   - **Enums**: `UserRole`, `UserStatus`, `RunnerStatus`, `OrderStatus`, `OrderStoreStatus`, `LedgerEntryType`, `SettlementStatus`
   - **Models**: `User`, `RefreshToken`, `Customer`, `CustomerAddress`, `Runner`, `Admin`, `Order`, `OrderItem`, `OrderStore`, `Receipt`, `Rating`, `LedgerEntry`, `Settlement`, `SettlementItem`, `AuditLog`
   - جميع العلاقات (relations) كما هي بالضبط في الوثيقة
   - جميع الفهارس (indexes) كما هي بالضبط في الوثيقة
   - جميع القيم الافتراضية والقيود (unique, default, optional)
6. إعداد قاعدة البيانات محلياً باستخدام `docker-compose.yml` في جذر المشروع لتشغيل PostgreSQL، أو توثيق خيار الاتصال بقاعدة سحابية.
7. إنشاء ملف `.env` في `apps/api/` يتضمن `DATABASE_URL` (placeholder):
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/fawrun?schema=public&connection_limit=10"
   ```
8. تنفيذ أول migration:
   ```bash
   cd apps/api && npx prisma migrate dev --name init
   ```
9. التحقق من أن `npx prisma generate` يعمل بنجاح.
10. إعداد `AppModule` الرئيسي في `apps/api/src/app.module.ts` يستورد: `ConfigModule.forRoot()`, `PrismaService` (كـ global provider).
11. إضافة Helmet في `main.ts`:
    ```typescript
    import helmet from 'helmet';
    app.use(helmet());
    ```
12. تحديد Port 3000 في `main.ts` مع global prefix `/api/v1`:
    ```typescript
    app.setGlobalPrefix('api/v1');
    await app.listen(3000);
    ```
13. إعداد `@sentry/node` في `main.ts` لالتقاط الأخطاء.
14. إعداد Global Exception Filter يُرجع أخطاء بالشكل الموحد:
    ```json
    { "statusCode": 400, "error": "VALIDATION_ERROR", "message": "..." }
    ```
    وفق أكواد الحالة الواردة في القسم 9.0: 400, 401, 403, 404, 409, 422, 500

**المخرج المتوقع:**
- مشروع NestJS يعمل في `apps/api/`
- Prisma Schema كامل في `apps/api/prisma/schema.prisma`
- أول migration ناجحة
- `prisma.service.ts` جاهز
- هيكل المجلدات لجميع الـ modules موجود (فارغ)
- التطبيق يبدأ على Port 3000 مع prefix `/api/v1`
- Helmet مفعّل
- Global Exception Filter يعمل بالشكل الموحد

**الاعتماديات:** المهام 1.1, 1.2, 1.3

---

### 1.5 بناء Auth Module — التسجيل (Register)

**الوصف:**
بناء endpoint تسجيل العملاء الجدد `POST /api/v1/auth/register` وفق ما ورد في القسمين 7.1 و 9.1 من الوثيقة.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/auth/`:
   - `auth.module.ts`
   - `auth.controller.ts`
   - `auth.service.ts`
   - `dto/register.dto.ts`

2. في `dto/register.dto.ts`: استخدام Zod schema من `@fawrun/shared-types` للتحقق من البيانات الواردة:
   ```
   {
     "name": "string",
     "whatsapp": "string",
     "altPhone": "string | null",
     "password": "string (min 8)",
     "address": {
       "lat": "number",
       "lng": "number",
       "description": "string"
     }
   }
   ```

3. في `auth.service.ts` — دالة `register()`:
   - التحقق من عدم وجود مستخدم بنفس رقم WhatsApp (إرجاع 409 CONFLICT إذا موجود)
   - تجزئة كلمة المرور بـ bcrypt مع 12 rounds
   - إنشاء سجل `User` بـ:
     - `role`: `CUSTOMER`
     - `status`: `PENDING_VERIFICATION`
   - إنشاء سجل `Customer` مرتبط
   - إنشاء سجل `CustomerAddress` مرتبط بالإحداثيات والوصف
   - كل ما سبق داخل Prisma transaction واحدة
   - إرسال حدث WebSocket للإدارة: `user:new_registration` مع `{ userId, userName, whatsapp }` (يُعدّ لاحقاً عند اكتمال WebSocket Gateway — في هذه المرحلة يُحضّر الكود ولكن لا يُرسل فعلياً)

4. في `auth.controller.ts`:
   - `@Post('register')` — لا يتطلب Auth
   - يستقبل body ويحققه عبر Zod
   - يُرجع 201 مع رسالة نجاح

5. إعداد Rate Limiting على endpoint التسجيل: 3 محاولات / ساعة لكل IP (وفق القسم 14)

**المخرج المتوقع:**
- `POST /api/v1/auth/register` يعمل
- حساب جديد يُنشأ بحالة `PENDING_VERIFICATION`
- كلمة المرور مُجزّأة بـ bcrypt (12 rounds)
- العنوان يُحفظ في `CustomerAddress`
- Rate limit: 3/ساعة
- أخطاء التحقق تُرجع بالشكل الموحد

**الاعتماديات:** المهمة 1.4

---

### 1.6 بناء Auth Module — تسجيل الدخول (Login)

**الوصف:**
بناء endpoint تسجيل الدخول `POST /api/v1/auth/login` وفق ما ورد في القسمين 7.1 و 9.1.

**خطوات التنفيذ التفصيلية:**

1. إنشاء أو تحديث الملفات في `apps/api/src/modules/auth/`:
   - `dto/login.dto.ts`
   - تحديث `auth.service.ts`
   - تحديث `auth.controller.ts`

2. في `auth.service.ts` — دالة `login()`:
   - البحث عن المستخدم بـ `whatsapp` (مع `isDeleted: false`)
   - مقارنة كلمة المرور بـ bcrypt
   - إذا فشلت المصادقة: إرجاع 401 UNAUTHORIZED
   - توليد Access Token (JWT):
     - Payload: `{ sub: user.id, role: user.role, status: user.status }`
     - خوارزمية: RS256 (مفتاح خاص/عام)
     - صلاحية: ساعتان
   - توليد Refresh Token:
     - Random 64-byte string (crypto.randomBytes)
     - تجزئة الـ token بـ bcrypt وحفظه في جدول `RefreshToken` مع:
       - `userId`
       - `tokenHash`
       - `deviceInfo` (اختياري، من headers)
       - `isRevoked: false`
   - إرجاع Response:
     ```json
     {
       "accessToken": "JWT...",
       "refreshToken": "random-string...",
       "user": {
         "id": "...",
         "name": "...",
         "role": "CUSTOMER | RUNNER | ADMIN",
         "status": "PENDING_VERIFICATION | VERIFIED ..."
       }
     }
     ```

3. توليد مفاتيح JWT RS256 باستخدام OpenSSL:
   ```bash
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem
   ```
4. إنشاء ملفات JWT config:
   - `apps/api/src/config/jwt.config.ts` — يقرأ `JWT_PRIVATE_KEY` و `JWT_PUBLIC_KEY` من env
   - إعداد `@nestjs/jwt` مع RS256

4. إعداد Rate Limiting: 10 محاولات / 15 دقيقة لكل IP

**المخرج المتوقع:**
- `POST /api/v1/auth/login` يعمل
- Access Token صالح لساعتين مع RS256
- Refresh Token عشوائي 64-byte، hash محفوظ في DB
- Rate limit: 10/15 دقيقة
- Response بالشكل المحدد

**الاعتماديات:** المهمة 1.5

---

### 1.7 بناء Auth Module — تجديد Access Token (Refresh)

**الوصف:**
بناء endpoint تجديد الـ Access Token تلقائياً `POST /api/v1/auth/refresh` وفق القسم 7.1. هذا الـ endpoint يُستدعى صامتاً من الـ Frontend قبل انتهاء الـ Access Token بـ 10 دقائق.

**خطوات التنفيذ التفصيلية:**

1. في `auth.service.ts` — دالة `refresh()`:
   - استقبال `refreshToken` من body
   - جلب جميع الـ Refresh Tokens غير الملغاة (`isRevoked: false`) للتحقق
   - مقارنة الـ token الوارد مع كل `tokenHash` في DB عبر bcrypt
   - إذا لم يُطابق أي token أو كان ملغى: إرجاع 401 UNAUTHORIZED
   - إذا طابق:
     - توليد Access Token جديد (نفس الـ payload)
     - إرجاع Access Token الجديد فقط (الـ Refresh Token لا يتغير)
   - Response:
     ```json
     {
       "accessToken": "new-JWT...",
       "refreshToken": "same-refresh-token...",
       "user": { ... }
     }
     ```

2. في `auth.controller.ts`:
   - `@Post('refresh')` — لا يتطلب Auth (الـ Refresh Token في body)

3. ملاحظة: الـ Frontend سيستدعي هذا الـ endpoint تلقائياً قبل انتهاء صلاحية Access Token بـ 10 دقائق. المستخدم لا يشعر بشيء.

**المخرج المتوقع:**
- `POST /api/v1/auth/refresh` يعمل
- يُرجع Access Token جديد عند تقديم Refresh Token صالح
- يُرجع 401 عند تقديم token ملغى أو غير موجود

**الاعتماديات:** المهمة 1.6

---

### 1.8 بناء Auth Module — تسجيل الخروج (Logout)

**الوصف:**
بناء endpoint تسجيل الخروج `POST /api/v1/auth/logout` وفق القسم 7.1.

**خطوات التنفيذ التفصيلية:**

1. في `auth.service.ts` — دالة `logout()`:
   - يتطلب Auth (Access Token في header)
   - استقبال `refreshToken` من body
   - البحث عن الـ Refresh Token في DB ومقارنة الـ hash
   - تحديث: `isRevoked = true`, `revokedAt = new Date()`
   - إرجاع 200 مع رسالة نجاح

2. في `auth.controller.ts`:
   - `@Post('logout')` — يتطلب Auth

3. إنشاء JWT Auth Guard في `apps/api/src/common/guards/jwt-auth.guard.ts`:
   - يقرأ `Authorization: Bearer <token>` من header
   - يتحقق من صلاحية الـ JWT باستخدام المفتاح العام (RS256)
   - يُرفق بيانات المستخدم (`userId`, `role`, `status`) في الـ Request
   - يُرجع 401 إذا كان الـ token منتهياً أو غير صالح

4. إنشاء Role Guard في `apps/api/src/common/guards/roles.guard.ts`:
   - يتحقق من أن الـ `role` في الـ JWT يطابق الأدوار المسموحة
   - يُرجع 403 FORBIDDEN إذا لم يكن مسموحاً

5. إنشاء Decorator `@Roles()` في `apps/api/src/common/decorators/roles.decorator.ts`

6. إنشاء Decorator `@CurrentUser()` في `apps/api/src/common/decorators/current-user.decorator.ts` لاستخراج بيانات المستخدم من الـ Request

**المخرج المتوقع:**
- `POST /api/v1/auth/logout` يعمل
- Refresh Token يُلغى في DB
- JWT Auth Guard يعمل على الـ endpoints المحمية
- Role Guard يعمل مع `@Roles()` decorator
- `@CurrentUser()` decorator يستخرج بيانات المستخدم

**الاعتماديات:** المهمة 1.7

---

### 1.9 آلية التحقق اليدوي من WhatsApp

**الوصف:**
تنفيذ آلية التحقق من حسابات العملاء الجدد يدوياً عبر WhatsApp، وفق القسم 7.1. العملية تسير كالتالي:
1. العميل يسجّل في التطبيق → حالته `PENDING_VERIFICATION`
2. العميل يرسل رسالة من رقم WhatsApp الخاص به إلى رقم WhatsApp الإدارة (خارج التطبيق — لا يوجد تكامل مع WhatsApp API)
3. Admin يتحقق من أن الرقم يطابق المسجَّل ويضغط "تفعيل الحساب" من لوحة الإدارة
4. الحالة تصبح `VERIFIED`
5. العميل يستلم إشعاراً عبر WebSocket

**خطوات التنفيذ التفصيلية:**

1. لا يوجد تكامل تقني مع WhatsApp — العملية يدوية بالكامل.
2. ما يجب تنفيذه هو Endpoint التفعيل من طرف Admin (مهمة 1.10).
3. التأكد من أن المستخدمين بحالة `PENDING_VERIFICATION`:
   - يمكنهم تسجيل الدخول (يحصلون على tokens)
   - لا يمكنهم إنشاء طلبات (يُحجبون بـ Guard يتحقق من `status === 'VERIFIED'`)
4. إنشاء Guard إضافي `VerifiedUserGuard` في `apps/api/src/common/guards/verified-user.guard.ts`:
   - يتحقق من أن `user.status === 'VERIFIED'`
   - يُرجع 403 مع رسالة "الحساب لم يُفعّل بعد"
   - يُستخدم على endpoints العمليات (إنشاء طلب، إلخ) وليس على endpoints القراءة (بيانات الحساب)

**المخرج المتوقع:**
- `VerifiedUserGuard` جاهز ويُطبّق على endpoints العمليات
- المستخدمون غير المفعّلين يمكنهم تسجيل الدخول لكن لا يمكنهم إجراء عمليات

**الاعتماديات:** المهمة 1.8

---

### 1.10 Admin: إدارة المستخدمين + تفعيل الحسابات

**الوصف:**
بناء endpoints إدارة المستخدمين من لوحة الإدارة، وفق القسم 9.4. تشمل: قائمة العملاء، تفاصيل عميل، تفعيل/رفض/تعليق حساب، وإنشاء حسابات مندوبين.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/users/`:
   - `users.module.ts`
   - `users.controller.ts` (تحت prefix `/admin`)
   - `users.service.ts`

2. بناء الـ Endpoints التالية (جميعها تتطلب Auth + Role: ADMIN):

   **`GET /api/v1/admin/users`** — قائمة العملاء:
   - يدعم Pagination: `page` (default 1), `limit` (default 20, max 100)
   - Response بالشكل:
     ```json
     {
       "data": [{ "id", "name", "whatsapp", "altPhone", "status", "createdAt", ... }],
       "meta": { "total", "page", "limit", "totalPages" }
     }
     ```

   **`GET /api/v1/admin/users/:id`** — تفاصيل عميل:
   - يشمل بيانات User + Customer + CustomerAddress
   - يُرجع 404 إذا لم يُوجد

   **`PUT /api/v1/admin/users/:id/verify`** — تفعيل حساب:
   - يُغيّر `status` من `PENDING_VERIFICATION` إلى `VERIFIED`
   - يُسجّل `AuditLog` بحدث `USER_VERIFIED` مع `actorId` = Admin ID و `actorRole` = `'ADMIN'`
   - يُرسل حدث WebSocket للعميل: `account:verified` مع `{ message: "تم تفعيل حسابك" }` إلى room `customer:{customerId}` (تُبنى بدون إرسال فعلي، ويتم تفعيل الإرسال لاحقاً في المهمة 1.11)
   - يُرجع 422 إذا كان الحساب ليس بحالة `PENDING_VERIFICATION`

   **`PUT /api/v1/admin/users/:id/reject`** — رفض حساب:
   - يُغيّر `status` إلى `REJECTED`
   - يُسجّل `AuditLog` بحدث `USER_REJECTED`
   - يُرجع 422 إذا كان الحساب ليس بحالة `PENDING_VERIFICATION`

   **`PUT /api/v1/admin/users/:id/suspend`** — تعليق حساب:
   - يُغيّر `status` إلى `SUSPENDED`
   - يُلغي جميع Refresh Tokens للمستخدم (`isRevoked = true` لكل tokens)
   - يُسجّل `AuditLog` بحدث `USER_SUSPENDED`
   - في أقصى تقدير ساعتين والجلسة تنتهي وحدها

3. إنشاء الملفات في `apps/api/src/modules/runners/`:
   - `runners.module.ts`
   - `runners.controller.ts` (تحت prefix `/admin`)
   - `runners.service.ts`

4. بناء Endpoints المندوبين:

   **`GET /api/v1/admin/runners`** — قائمة المندوبين مع حالاتهم:
   - يدعم Pagination
   - يعرض: `id`, `name`, `whatsapp`, `status` (AVAILABLE/ON_MISSION/UNAVAILABLE), `isVisible`, `avgRating`, `totalRatings`, `notes`

   **`POST /api/v1/admin/runners`** — إنشاء حساب مندوب:
   - يستقبل: `name`, `whatsapp`, `password`, `altPhone` (optional)
   - يُنشئ User بـ `role: RUNNER`, `status: VERIFIED` (المندوب لا يحتاج تحقق — الإدارة أنشأته)
   - يُنشئ Runner record مرتبط
   - كلمة المرور تُجزّأ بـ bcrypt (12 rounds)
   - Transaction واحدة

   **`PUT /api/v1/admin/runners/:id`** — تعديل بيانات مندوب:
   - يمكن تعديل: `name`, `altPhone`, `notes`, `password` (اختياري)

   **`PUT /api/v1/admin/runners/:id/visibility`** — إخفاء/إظهار مندوب:
   - يُغيّر `isVisible` (true/false)
   - المندوب المخفي لا يظهر في قوائم العملاء

5. إنشاء `apps/api/src/modules/audit/`:
   - `audit.module.ts`
   - `audit.service.ts` — خدمة لتسجيل الأحداث في `AuditLog`
   - دالة `log()` تستقبل: `orderId?`, `actorId?`, `actorRole?`, `event`, `fromStatus?`, `toStatus?`, `meta?`
   - الجدول Append-Only — لا يوجد update أو delete أبداً

**المخرج المتوقع:**
- جميع الـ Endpoints المذكورة تعمل وتُرجع البيانات بالشكل الصحيح
- Pagination يعمل على القوائم
- AuditLog يُسجّل لكل عملية تغيير حالة
- إنشاء مندوب يُنشئ User + Runner في transaction واحدة
- WebSocket event `account:verified` جاهز (تُبنى هذه الخطوة كتحضير للكود بدون إرسال فعلي، ويتم تفعيل الإرسال لاحقاً في المهمة 1.11)

**الاعتماديات:** المهام 1.8, 1.9

---

### 1.11 WebSocket Gateway أساسي

**الوصف:**
إنشاء بوابة WebSocket باستخدام Socket.IO عبر `@nestjs/websockets` وفق القسم 10 من الوثيقة.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/websocket/gateways/`:
   - `orders.gateway.ts` — Namespace: `/orders`
   - `admin.gateway.ts` — Namespace: `/admin`

2. **المصادقة عند الاتصال:**
   - عند اتصال أي client، يجب إرسال `{ token: accessToken }` في auth header
   - الـ Gateway يتحقق من صلاحية الـ JWT
   - إذا فشل التحقق: يرفض الاتصال

3. **إدارة الـ Rooms:**
   - العميل ينضم تلقائياً لـ room باسم: `customer:{customerId}`
   - Runner ينضم تلقائياً لـ room باسم: `runner:{runnerId}`
   - Admin ينضم تلقائياً لـ room باسم: `admin:all`
   - يتم تحديد الـ room بناءً على `role` في الـ JWT

4. **إنشاء خدمة WebSocket مركزية** في `apps/api/src/modules/notifications/`:
   - `notifications.module.ts`
   - `notifications.service.ts`
   - توفر دوال مساعدة:
     - `emitToCustomer(customerId: string, event: string, data: any)`
     - `emitToRunner(runnerId: string, event: string, data: any)`
     - `emitToAdmin(event: string, data: any)`
   - تستخدم الـ Gateways داخلياً للإرسال إلى الـ Rooms المناسبة

5. **الأحداث المطلوبة في هذا Sprint** (التعريف فقط — الإرسال الفعلي يُكمل في الـ Sprints اللاحقة):
   - أحداث العميل: `account:verified`
   - أحداث Admin: `user:new_registration`

6. تعريف أنواع أصوات الإشعار (للاستخدام لاحقاً في Frontend):
    ```typescript
    type SoundType = 'new_order' | 'status_update' | 'urgent' | 'success';
    ```

**أمثلة الأحداث المرسلة في هذا Sprint:**

حدث `account:verified` (للعميل في room `customer:{customerId}`):
```typescript
{
  event: 'account:verified',
  room: 'customer:USER_ID',
  payload: { message: 'تم تفعيل حسابك' },
  sound: 'success' as SoundType
}
```

حدث `user:new_registration` (للإدارة في room `admin:all`):
```typescript
{
  event: 'user:new_registration',
  room: 'admin:all',
  payload: { userId, userName, whatsapp },
  sound: 'new_order' as SoundType
}
```

**قواعد WebSocket:**
- كل client يجب أن يُرسل `{ token: accessToken }` عند الاتصال — المصادقة عبر JWT (RS256)
- الغرف تُنشأ تلقائياً حسب دور المستخدم: `customer:{id}`, `runner:{id}`, `admin:all`
- الأحداث تُرسل دائماً من الـ Backend فقط — لا يُرسل أي حدث من الـ Frontend (Server is Source of Truth)
- كل حدث يحتوي على `sound` اختياري من نوع `SoundType` للـ Frontend

**المخرج المتوقع:**
- WebSocket Gateway يعمل مع Socket.IO على namespace `/orders` و `/admin`
- المصادقة عند الاتصال عبر JWT
- الـ Rooms تُدار تلقائياً حسب دور المستخدم
- خدمة `NotificationsService` توفر دوال إرسال مركزية
- حدث `account:verified` يُرسل فعلياً عند تفعيل الحساب
- حدث `user:new_registration` يُرسل فعلياً عند تسجيل عميل جديد

**الاعتماديات:** المهام 1.8, 1.10

---

### 1.12 إعداد Rate Limiting العام

**الوصف:**
تفعيل Rate Limiting على مستوى التطبيق وفق القسم 14 من الوثيقة.

**خطوات التنفيذ التفصيلية:**

1. تثبيت `@nestjs/throttler` إذا لم يكن مثبتاً.
2. إعداد `ThrottlerModule` في `AppModule`:
   - Rate limit عام: 100 طلب / دقيقة
3. تخصيص Rate limits حسب الـ endpoint:
   - `POST /auth/login`: 10 محاولات / 15 دقيقة لكل IP
   - `POST /auth/register`: 3 محاولات / ساعة لكل IP
   - باقي الـ endpoints: 100 طلب / دقيقة (الافتراضي)
4. التحقق من أن الـ throttler يُرجع 429 Too Many Requests عند تجاوز الحد.

**المخرج المتوقع:**
- Rate Limiting مفعّل على كل الـ endpoints
- حدود مخصصة لـ login و register
- Response 429 عند تجاوز الحد

**الاعتماديات:** المهمة 1.4

---

### 1.13 إعداد CORS + Environment Variables

**الوصف:**
إعداد CORS وإدارة متغيرات البيئة وفق القسم 14 والقسم 15.

**خطوات التنفيذ التفصيلية:**

1. إعداد CORS في `main.ts`:
   - تحديد `origin` بـ Origins المعتمدة فقط (من env variable)
   - تفعيل `credentials: true`
2. إنشاء ملف `.env.example` يوضح جميع المتغيرات المطلوبة:
   ```
   # Backend
   DATABASE_URL=
   JWT_PRIVATE_KEY=
   JWT_PUBLIC_KEY=
   R2_ACCOUNT_ID=
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_BUCKET_NAME=
   SENTRY_DSN=
   CORS_ORIGINS=
   ```
3. التأكد من أن `.env` مُضاف في `.gitignore` ولا يُرفع على Git.
4. استخدام `@nestjs/config` مع `ConfigModule.forRoot({ isGlobal: true })`.

**المخرج المتوقع:**
- CORS مُعدّ ومحدود بالـ Origins المعتمدة
- `.env.example` يوثّق جميع المتغيرات
- `.env` محمي من Git
- `ConfigModule` يعمل عالمياً

**الاعتماديات:** المهمة 1.4

---

## معايير الإنجاز (Definition of Done) — Sprint 1

- [x] جميع الحزم تبني بنجاح عبر `pnpm build` من الجذر (Turborepo pipeline يعمل)،都可以 تشغيل `pnpm install` بنجاح
- [x] حزمته `@fawrun/shared-constants` تبني بنجاح وتحتوي على ثوابت التسعير وحالات الطلب
- [x] حزمته `@fawrun/shared-types` تبني بنجاح وتحتوي على DTOs وZod Schemas
- [x] Prisma Schema كامل (جميع الـ models والـ enums والعلاقاتالفهارس) ومطابق للقسم 5
- [x] أول Migration ناجحة وقاعدة البيانات تُنشأ بدون أخطاء
- [x] `POST /api/v1/auth/register` يُنشئ حساباً بحالة `PENDING_VERIFICATION`
- [x] `POST /api/v1/auth/login` يُرجع Access Token (JWT RS256، ساعتان) و Refresh Token (64-byte، دائم)
- [x] `POST /api/v1/auth/refresh` يُحدث Access Token صمتاً
- [x] `POST /api/v1/auth/logout` يُلغي Refresh Token في DB
- [x] JWT Auth Guard و Role Guard يعملان على الـ endpoints المحمية
- [x] `VerifiedUserGuard` يمنع المستخدمين غير المفعّلات من العمليات
- [x] Adminiqued: عرض المستخدمين، تفعيل/ reject/ تعليق حساب، إنشاء مندوب
- [x] كل عملية تغيير حالة تُسجَّل في AuditLog
- [x] WebSocket Gateway يعمل مع المصادقة وإدارة الـ Rooms
- [x] حدث `account:verified` يصل للعميل عند التفعيل
- [x] Rate Limiting مُفعّل بالحدود المحددة
- [x] CORS مُعدّ ومحدود
- [x] Helmet مُفعّل
- [x] التطبيق يبدأ على Port 3000 مع prefix `/api/v1`
- [x] Global Exception Filter يُرجع أخطاء بالشكل الموحد

**Sprint 1 Complete — 2026-09-11**

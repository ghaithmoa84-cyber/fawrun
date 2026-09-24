# FAWRUN — Project Status & Diagnostic Playbook

> **آخر تحديث:** 2026-09-23
> **الغرض:** هذا الملف هو المرجع الوحيد لحالة المشروع، القرارات المعمارية، الأخطاء المعروفة، وحلولها.
> **مهم:** أي وكيل أو مطوّر يبدأ العمل يجب أن يقرأ هذا الملف كاملًا قبل أي تعديل.

---

## 1. المعمارية الحالية (لا تُغيَّر بدون سبب)

| المكوّن | التقنية | الاستضافة |
|---|---|---|
| Monorepo | pnpm@9.15.9 workspace + Turborepo | — |
| API | NestJS 12 + Prisma 5.22 + Node 20 | Railway (Dockerfile, `node:20-slim`) |
| Database | PostgreSQL | Railway (internal network) |
| Admin Panel | Next.js 14.2 | Vercel |
| Runner PWA | Vite + vite-plugin-pwa | Vercel |
| Customer Web | Vite | Vercel |

### روابط الإنتاج
- **API**: `https://fawrun-api-production.up.railway.app/api/v1`
- **Admin**: `https://fawrun-admin.vercel.app`
- **Runner**: `https://fawrun-runner-pwa-steel.vercel.app`
- **Customer**: `https://fawrun-customer-web-three.vercel.app`
- **GitHub**: `github.com/ghaithmoa84-cyber/fawrun` (master)

### 1.1 حالة الإنتاج وقاعدة البيانات — 2026-09-23

| الحقيقة | الحالة |
|---|---|
| منصة الإنتاج وقاعدة البيانات | **Railway** — وليس Supabase |
| Schema Drift | **0**، آخر فحص: **2026-09-23** |
| سجل `_prisma_migrations` | **6 migrations** مُسجَّلة |
| Migration الحالية | `20260923154000_add_order_store_soft_delete` مُطبَّق |
| آلية نشر الـ migrations | `prisma migrate deploy` يُنفَّذ يدويًا من Railway Console؛ لا يوجد auto-migrate في Dockerfile |

### 1.2 إصدارات وإصلاحات مكتملة — 2026-09-23

| المجال | النتيجة |
|---|---|
| الأمان | تثبيت `ACCOUNT_SUSPENDED_MESSAGE`، منع دخول المستخدم المعلّق في backend والواجهتين، وإضافة endpoint لإعادة التفعيل (`unsuspend`) |
| التحقق من المدخلات | تعريب أخطاء Zod عبر `setErrorMap` |
| أنواع الهاتف | توحيد `SyrianPhoneSchema` في `shared-types` |
| أدوات التشخيص | إضافة `scripts/diff-schema.js` |
| OrderStore | يعمل بدون أخطاء |

---

## 2. قرارات لا تُنقَض (Don'ts)

- ❌ **لا تُضِف `output` إلى `generator client`** في `schema.prisma` — يكسر بنية pnpm ويسبب `@prisma/client did not initialize yet`.
- ❌ **لا تُعِد `railway.toml` بنمط Nixpacks** — يجب أن يبقى `builder = "DOCKERFILE"` أو الملف محذوفًا تمامًا.
- ❌ **لا تستخدم `prisma db push` في production** إلا كإجراء طوارئ — يُسبب Schema Drift بدون migration دائم.
- ❌ **لا تُمرِّر `User.id` إلى FK يشير إلى `Admin.id`** (والعكس). تحقق من `schema.prisma` قبل أي كتابة.
- ❌ **لا تُغيّر `binaryTargets`** — القيمة الحالية: `["native", "debian-openssl-3.0.x"]`.
- ❌ **لا تلمس `pnpm-workspace.yaml` أو `package.json` الجذري** بدون سبب موثّق.
- ❌ **لا تُضِف `postinstall`** يشغّل `prisma generate` على Vercel frontend — لا فائدة، ويطيل البناء.

---

## 3. إعدادات حرجة (لا تُنسى)

### 3.1 Railway Variables (Service: api)
```
DATABASE_URL          = <PostgreSQL internal URL>
JWT_PRIVATE_KEY       = <RSA private key>
JWT_PUBLIC_KEY        = <RSA public key>
NODE_ENV              = production
PORT                  = 3000
CORS_ORIGINS          = https://fawrun-admin.vercel.app,https://fawrun-runner-pwa-steel.vercel.app,https://fawrun-customer-web-three.vercel.app
R2_ACCOUNT_ID         = <dummy-for-now>
R2_ACCESS_KEY_ID      = <dummy-for-now>
R2_SECRET_ACCESS_KEY  = <dummy-for-now>
R2_BUCKET_NAME        = <dummy-for-now>
SENTRY_DSN            = <optional>
TRUST_PROXY           = 1
```

**⚠️ تحذير:** `TRUST_PROXY` يجب أن تكون `1` أو رقمًا صحيحًا، **وليس `true`** (Express يفسّر `"true"` كـ IP ويفشل).

### 3.2 Dockerfile (apps/api, على Railway)
```dockerfile
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .
COPY tsconfig.json .
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter fawrun-api exec prisma generate
RUN pnpm --filter @fawrun/shared-constants build
RUN pnpm --filter @fawrun/shared-types build
RUN pnpm --filter fawrun-api build
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
```
**ملاحظات:**
- لا يوجد `prisma generate` في `CMD` — يعمل في البناء فقط.
- `openssl` ضروري لـ Prisma query engine.
- الحزم المشتركة (`shared-types`, `shared-constants`) يجب بناؤها قبل `fawrun-api build`.

### 3.3 `apps/api/prisma/schema.prisma` (بلوك generator)
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```
**لا تُضِف `output`.**

### 3.4 Vercel Build Settings (لكل مشروع)

| الحقل | Admin | Runner | Customer |
|---|---|---|---|
| Framework | Next.js | Vite | Vite |
| Root Directory | `apps/admin-web` | `apps/runner-pwa` | `apps/customer-web` |
| Install Command | `pnpm install --frozen-lockfile` | نفس | نفس |
| Build Command | `cd ../.. && pnpm --filter admin-web... build` | `cd ../.. && pnpm --filter runner-pwa... build` | `cd ../.. && pnpm --filter customer-web... build` |
| Output Directory | `.next` | `dist` | `dist` |
| Node.js version | 22.x | 22.x | 22.x |
| Include files outside root | ✅ | ✅ | ✅ |

**⚠️ ملاحظات حرجة:**
- **`...` (ثلاث نقاط) في Build Command إلزامية** — تجبر pnpm على بناء الحزم المشتركة أولًا.
- **Output Directory = `dist` فقط** (ليس `apps/runner-pwa/dist`) — Vercel يقيس نسبةً إلى Root Directory.
- **`vercel.json` مع rewrites** في `runner-pwa` و `customer-web` ضروري لـ SPA routing:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

### 3.5 Vercel Environment Variables
**Admin:**
```
NEXT_PUBLIC_API_URL = https://fawrun-api-production.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL  = wss://fawrun-api-production.up.railway.app
```
**Runner & Customer:**
```
VITE_API_URL         = https://fawrun-api-production.up.railway.app/api/v1
VITE_WS_URL          = wss://fawrun-api-production.up.railway.app
VITE_ADMIN_WHATSAPP  = <رقم دولي بدون +>   # customer-web فقط
```

---

## 4. Diagnostic Playbook — الأخطاء وحلولها

| # | رسالة الخطأ | السبب الجذري | الحل |
|---|---|---|---|
| 1 | `@prisma/client did not initialize yet` | `output` مخصّص في generator client | احذف سطر `output` |
| 2 | خطأ 1 استمر على Railway رغم الإصلاح | Nixpacks بدل Dockerfile | احذف `railway.toml` أو اضبط Builder=Dockerfile |
| 3 | `libssl.so.1.1: cannot open shared object file` | Prisma خمّن openssl-1.1.x على صورة تحتوي 3.0 | `binaryTargets = ["native", "debian-openssl-3.0.x"]` |
| 4 | `R2 configuration is incomplete` | متغيّرات R2 ناقصة | أضف `R2_*` في Railway Variables |
| 5 | `TypeError: invalid IP address: true` | `TRUST_PROXY="true"` كنص | اجعلها `1` |
| 6 | `isDeleted does not exist in current database` | Schema Drift | طبِّق migration المطلوب، ثم نفّذ `prisma migrate deploy` يدويًا من Railway Console وتحقّق من Schema Drift = `0`؛ لا تستخدم `db push` إلا كإجراء طوارئ موثّق |
| 7 | `Settlement_closedByAdminId_fkey` violation | تمرير User.id بدل Admin.id | استخدم `user.adminId` من JwtAuthGuard |
| 8 | `AuditLog_actorId_fkey` violation | تمرير Admin.id بدل User.id | استخدم `user.userId` في AuditLog |
| 9 | Vercel 404 على مسارات SPA | missing SPA fallback | أضف `vercel.json` مع rewrites |
| 10 | Vercel build فشل: `Can't resolve '@fawrun/shared-*'` | pnpm لم يبنِ الحزم المشتركة | استخدم `pnpm --filter <pkg>... build` |
| 11 | `No Output Directory named "dist"` | Output Directory من جذر الـ repo بدل Root Dir | اضبط `dist` فقط |
| 12 | `Cannot GET /api/v1` (على الجذر) | لا يوجد root route | **طبيعي** — ليس خطأ |

### أوامر تشخيص سريعة (Railway Console)
```bash
cd /app/apps/api

# قائمة المستخدمين
node -e 'const{PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.user.findMany({select:{id:true,whatsapp:true,role:true}}).then(u=>console.log(JSON.stringify(u,null,2))).finally(()=>p.$disconnect());'

# قائمة Admins (FK targets)
node -e 'const{PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.admin.findMany({include:{user:{select:{id:true,whatsapp:true}}}}).then(a=>console.log(JSON.stringify(a,null,2))).finally(()=>p.$disconnect());'

# قائمة Runners
node -e 'const{PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.runner.findMany().then(r=>console.log(JSON.stringify(r,null,2))).finally(()=>p.$disconnect());'

# حالة الـ migrations
pnpm exec prisma migrate status

# تطبيق migrations جديدة
pnpm exec prisma migrate deploy
```

### التحقق من CORS
```bash
curl -I -X OPTIONS https://fawrun-api-production.up.railway.app/api/v1/auth/login \
  -H "Origin: https://fawrun-admin.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```
**المتوقع:** `204` مع `Access-Control-Allow-Origin: https://fawrun-admin.vercel.app`.

---

## 5. البنود المكتملة والمختبرة على الإنتاج

| # | البند | الحالة | النتيجة |
|---|---|---|---|
| 1 | **تغيير كلمة مرور Admin الافتراضية** | ✅ مكتملة ومختبرة على الإنتاج | لم تعد بيانات الاعتماد الافتراضية مستخدمة |
| 2 | تحويل `db push` إلى migration دائم | ✅ مكتملة ومختبرة على الإنتاج | Schema Drift = `0` |
| 3 | `R2Service` → lazy (لا يرمي في constructor) | ✅ مكتملة ومختبرة على الإنتاج | اكتمل الإغلاق |
| 4 | تدقيق جميع FKs في schema (User vs Admin) | ✅ مكتملة ومختبرة على الإنتاج | اكتمل الإغلاق |
| 5 | `MODULE_TYPELESS_PACKAGE_JSON` warning | ✅ مكتملة ومختبرة على الإنتاج | اكتمل الإغلاق |
| 6 | ترقية API Dockerfile إلى `node:22-slim` | ✅ مكتملة ومختبرة على الإنتاج | اكتمل الإغلاق |
| 7 | استبدال قيم R2 الوهمية بقيم حقيقية | ✅ مكتملة ومختبرة على الإنتاج | اكتمل الإغلاق |
| 8 | Vercel Agent Skill plugin | ✅ مكتملة ومختبرة على الإنتاج | اكتمل الإغلاق |

---

## 6. حالة أول Admin (بيانات اختبار)

- **WhatsApp**: `+963000000000`
- **Password**: تم تغيير كلمة المرور الافتراضية؛ لا تُخزَّن بيانات الاعتماد في المستودع.
- **User.id**: `cmud1zc670000taxxpy1whxwh`
- **Admin.id**: `cmud6kmju0001alsq9suwt9dg`

**⚠️ لا تُعيد استخدام هذه البيانات في أي مكان عام.**

---

## 7. قواعد العمل مع الوكلاء

لقواعد التعامل، تدفق العمل، قواعد Git، قواعد الأمان، وخطط التراجع — انظر [HANDOFF.md](HANDOFF.md#قواعد-التعامل).

---

## 8. بنية المجلدات الأساسية

```
fawrun/
├── PROJECT_STATUS.md          ← هذا الملف
├── Dockerfile                  ← Railway (API)
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── package.json                ← root
├── turbo.json
├── apps/
│   ├── api/                    ← NestJS + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts (إن وُجد)
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── guards/jwt-auth.guard.ts
│   │   │   │   └── decorators/current-user.decorator.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── orders/
│   │   │   │   ├── settlements/
│   │   │   │   ├── audit/
│   │   │   │   └── receipts/  (R2)
│   │   │   └── main.ts
│   │   └── Dockerfile (إن لم يكن في الجذر)
│   ├── admin-web/              ← Next.js 14
│   │   ├── next.config.js
│   │   └── package.json
│   ├── runner-pwa/             ← Vite + PWA
│   │   ├── vercel.json
│   │   └── vite.config.ts
│   └── customer-web/           ← Vite
│       ├── vercel.json
│       └── vite.config.ts
└── packages/
    ├── shared-types/
    └── shared-constants/
```

---

## 9. سجل الأحداث الكبرى (Timeline)

| التاريخ | الحدث |
|---|---|
| 2026-09-22 | نشر API على Railway بنجاح بعد حل Prisma + Dockerfile |
| 2026-09-22 | نشر Admin + Runner + Customer على Vercel |
| 2026-09-22 | ضبط CORS + إنشاء أول Admin |
| 2026-09-22 | حل Schema Drift عبر `db push` |
| 2026-09-23 | إصلاح FK Settlements (User vs Admin) |
| 2026-09-23 | إصلاح FK AuditLog (Admin vs User) |
| 2026-09-23 | تأكيد أن الإنتاج على **Railway** وليس Supabase؛ Schema Drift = `0` و6 migrations مُسجَّلة |
| 2026-09-23 | تطبيق migration `20260923154000_add_order_store_soft_delete` وتوثيق النشر اليدوي من Railway Console |
| 2026-09-23 | إغلاق البنود #1–#8 بعد اكتمالها واختبارها على الإنتاج |
| 2026-09-23 | إصلاح `ACCOUNT_SUSPENDED_MESSAGE`، منع دخول المعلّق، وإضافة `unsuspend` |
| 2026-09-23 | تعريب أخطاء Zod، توحيد `SyrianPhoneSchema`، وإضافة `scripts/diff-schema.js` |

---

## 10. نصائح لتسريع التشخيص مستقبلًا

1. **عند أي خطأ، ابحث في جدول Playbook أولًا** (بند 4).
2. **انسخ نص الخطأ كاملًا** — لا تلخّصه.
3. **افحص `schema.prisma` قبل أي كتابة FK.**
4. **استخدم أوامر التشخيص السريقة** (بند 4) بدلًا من الاستنتاجات.
5. **بعد كل حل، حدّث بند 4 وبند 9.**
6. **احفظ screenshots لـ Railway Variables + Vercel Settings** في `docs/screenshots/`.

---

**نهاية الملف.**

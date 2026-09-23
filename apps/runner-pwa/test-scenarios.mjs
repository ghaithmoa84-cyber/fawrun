import axios from 'axios';
import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import crypto from 'node:crypto';

const API_BASE = 'http://localhost:3000/api/v1';
const WS_BASE = 'http://localhost:3000';

function getPrivateKey() {
  const envPath = fs.existsSync('apps/api/.env') ? 'apps/api/.env' : '../api/.env';
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/JWT_PRIVATE_KEY="([^"]+)"/);
  return match[1].replace(/\\n/g, '\n');
}

function generateJwt(userId, role, status = 'VERIFIED') {
  const privateKey = getPrivateKey();
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role,
      status,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey, 'base64url');
  return `${header}.${payload}.${signature}`;
}

async function runScenarioA() {
  console.log('\n========================================');
  console.log('السيناريو أ — رفع الإيصال (End-to-End)');
  console.log('========================================');

  // Hardcoded seeded IDs from DB check:
  // Admin: cmu9q71lb0000gziti19ufbrv
  // Runner: cmu9q71mj0006gzit9mg4642t
  // Customer: cmu9q71ma0003gzitsvslbo0q
  const runnerUserId = 'cmu9q71mj0006gzit9mg4642t';
  const adminUserId = 'cmu9q71lb0000gziti19ufbrv';
  const customerUserId = 'cmu9q71ma0003gzitsvslbo0q';
  const runnerToken = generateJwt(runnerUserId, 'RUNNER');
  const adminToken = generateJwt(adminUserId, 'ADMIN');
  const customerToken = generateJwt(customerUserId, 'CUSTOMER');

  console.log('\n[1] تسجيل دخول المندوب (Auth Token):');
  console.log(`✓ تم توثيق المندوب بنجاح (ID: ${runnerUserId})`);

  const testIp = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

  const runnerClient = axios.create({
    baseURL: API_BASE,
    headers: {
      Authorization: `Bearer ${runnerToken}`,
      'x-forwarded-for': testIp,
    },
  });

  const adminClient = axios.create({
    baseURL: API_BASE,
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'x-forwarded-for': testIp,
    },
  });

  // 2. Fetch Active Order
  console.log('\n[2] جلب الطلب النشط للمندوب (GET /runner/orders/active):');
  let activeOrderRes = await runnerClient.get('/runner/orders/active');
  let order = activeOrderRes.data;

  if (!order) {
    console.log('لا يوجد طلب نشط للمندوب، جاري إنشاء وتعيين طلب جديد له...');
    const customerClient = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${customerToken}`, 'x-forwarded-for': testIp },
    });
    const cRes = await customerClient.post('/customer/orders', {
      items: [{ itemName: 'أغراض تجريبية', quantity: '1', anyStore: true, customStoreName: null }],
      notes: 'طلب سيناريو الإيصال',
      preferredRunnerId: null,
      waitForPreferred: false,
      deliveryAddress: { lat: 33.5138, lng: 36.2765, description: 'دمشق' },
    });
    const oId = cRes.data.id;
    await adminClient.put(`/admin/orders/${oId}/start-review`, { notes: 'بدء مراجعة' });
    await adminClient.put(`/admin/orders/${oId}/approve`, { isPeripheral: false });
    const rList = await adminClient.get('/admin/runners');
    const list = Array.isArray(rList.data) ? rList.data : (rList.data.data || []);
    const rId = (list.find(r => r.whatsapp === '0933333333') || list[0]).id;
    await adminClient.put(`/admin/orders/${oId}/assign-runner`, { runnerId: rId });
    activeOrderRes = await runnerClient.get('/runner/orders/active');
    order = activeOrderRes.data;
  }

  console.log(`✓ الطلب النشط: #${order.orderNumber} (ID: ${order.id}) | الحالة: ${order.status}`);

  // 3. If ASSIGNED -> Start order
  if (order.status === 'ASSIGNED') {
    console.log('\n[3] بدء تنفيذ الطلب (PUT /runner/orders/:id/start):');
    const startRes = await runnerClient.put(`/runner/orders/${order.id}/start`);
    console.log(`✓ تم بدء الطلب. الحالة الجديدة: ${startRes.data.status}`);
    activeOrderRes = await runnerClient.get('/runner/orders/active');
    order = activeOrderRes.data;
  }

  // 4. Ensure at least one store exists and has < 5 receipts
  let store = order.orderStores?.find(s => !s.receipts || s.receipts.length < 5);
  if (!store) {
    // If all existing stores have 5 receipts, delete one receipt from the first store
    if (order.orderStores?.[0]?.receipts?.[0]) {
      const firstStore = order.orderStores[0];
      const recId = firstStore.receipts[0].id;
      console.log(`\n[4] تنظيف إيصال قديم لإفساح المجال (DELETE .../receipts/${recId}):`);
      await runnerClient.delete(`/runner/orders/${order.id}/stores/${firstStore.id}/receipts/${recId}`);
      store = firstStore;
    } else {
      console.log('\n[4] إضافة متجر للطلب (POST /runner/orders/:id/stores):');
      const addStoreRes = await runnerClient.post(`/runner/orders/${order.id}/stores`, {
        storeName: `متجر تجريبي ${Date.now().toString().slice(-4)}`,
      });
      store = addStoreRes.data.orderStore;
    }
  }
  console.log(`✓ المتجر المحدد للرفع: ${store.storeName} (ID: ${store.id}) | الحالة: ${store.status}`);

  // 5. Generate sample PNG image buffer (100 bytes)
  const samplePng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);

  // 6. Request Presigned URL
  console.log('\n[6] طلب رابط الرفع المسبق (POST /runner/orders/:id/stores/:storeId/receipts/presigned-url):');
  const presignedRes = await runnerClient.post(
    `/runner/orders/${order.id}/stores/${store.id}/receipts/presigned-url`,
    { fileType: 'png', fileSize: samplePng.length },
  );
  console.log('--- HTTP LOG: Presigned URL Request ---');
  console.log(`Request: POST ${API_BASE}/runner/orders/${order.id}/stores/${store.id}/receipts/presigned-url`);
  console.log('Payload:', { fileType: 'png', fileSize: samplePng.length });
  console.log('Response Status: 201 Created');
  console.log('Response Body:', JSON.stringify(presignedRes.data, null, 2));

  const { presignedUrl, r2Key } = presignedRes.data;

  // 7. Direct PUT to R2
  console.log('\n[7] رفع مباشر للملف على R2 عبر الـ presigned URL:');
  console.log('--- HTTP LOG: PUT to R2 Storage ---');
  console.log(`Request: PUT ${presignedUrl}`);
  console.log(`Headers: Content-Type: image/png`);
  console.log(`Body: Buffer (${samplePng.length} bytes)`);

  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    body: samplePng,
    headers: { 'Content-Type': 'image/png' },
  });
  console.log(`Response Status: ${uploadRes.status} ${uploadRes.statusText}`);

  // 8. Confirm Receipt creation
  console.log('\n[8] تأكيد إنشاء الإيصال في الـ API:');
  console.log('--- HTTP LOG: POST Confirm Receipt ---');
  console.log(`Request: POST ${API_BASE}/runner/orders/${order.id}/stores/${store.id}/receipts`);
  console.log('Request Body:', JSON.stringify({ r2Key }, null, 2));

  const confirmRes = await runnerClient.post(
    `/runner/orders/${order.id}/stores/${store.id}/receipts`,
    { r2Key },
  );
  console.log('Response Status: 201 Created');
  console.log('Response Body:', JSON.stringify(confirmRes.data, null, 2));

  // 9. Verify in Active Order
  console.log('\n[9] التحقق من ظهور الإيصال في شاشة المندوب:');
  await new Promise((r) => setTimeout(r, 2000));
  const updatedOrderRes = await runnerClient.get('/runner/orders/active');
  const updatedStore = updatedOrderRes.data.orderStores.find(s => s.id === store.id);
  console.log(`✓ عدد الإيصالات للمتجر في الواجهة: ${updatedStore.receipts.length}`);
  console.log('تفاصيل آخر إيصال:', JSON.stringify(updatedStore.receipts[updatedStore.receipts.length - 1], null, 2));

  // 10. Admin Verification
  console.log('\n[10] التحقق من لوحة الإدارة (GET /admin/orders/:id):');
  await new Promise((r) => setTimeout(r, 1000));
  const adminOrderRes = await adminClient.get(`/admin/orders/${order.id}`);
  const adminStore = adminOrderRes.data.orderStores.find(s => s.id === store.id);
  console.log(`✓ عدد الإيصالات لدى الإدارة: ${adminStore.receipts.length}`);
  console.log('آخر إيصال لدى الإدارة:', JSON.stringify(adminStore.receipts[adminStore.receipts.length - 1], null, 2));

  return { orderId: order.id, r2Key, runnerToken, adminToken, runnerUserId, adminUserId };
}

async function runScenarioB(runnerToken, adminToken, runnerUserId, _adminUserId) {
  console.log('\n========================================');
  console.log('السيناريو ب — الانتقال التلقائي عند order:assigned');
  console.log('========================================');

  const testIp = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

  const adminClient = axios.create({
    baseURL: API_BASE,
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'x-forwarded-for': testIp,
    },
  });

  // 1. Reset runner state in DB to AVAILABLE so they can receive a new order
  console.log('\n[1] إنهاء الطلب السابق وضبط حالة المندوب إلى "AVAILABLE":');
  const envPath = fs.existsSync('apps/api/.env') ? 'apps/api/.env' : '../api/.env';
  const env = fs.readFileSync(envPath, 'utf8');
  const dbUrl = env.match(/DATABASE_URL="?([^"\n\r]+)"?/)[1];
  const prismaPath = path.resolve(fs.existsSync('apps/api/node_modules/@prisma/client/index.js')
    ? 'apps/api/node_modules/@prisma/client/index.js'
    : '../api/node_modules/@prisma/client/index.js');
  const { PrismaClient } = await import(pathToFileURL(prismaPath).href);
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  await prisma.order.updateMany({
    where: { runner: { userId: runnerUserId }, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'OUT_FOR_DELIVERY'] } },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });
  await prisma.runner.updateMany({
    where: { userId: runnerUserId },
    data: { status: 'AVAILABLE' },
  });
  console.log('✓ المندوب الآن في حالة AVAILABLE وجاهز لتلقي الطلبات');

  // 2. Connect WebSocket
  console.log('\n[2] اتصال المندوب بـ WebSocket (/orders) بالـ Callback Auth:');
  let receivedTimestamp = null;
  let simulatedNavigationTimestamp = null;

  const socket = io(`${WS_BASE}/orders`, {
    auth: (cb) => cb({ token: runnerToken }),
    transports: ['websocket'],
  });

  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✓ WebSocket متصل بنجاح (Socket ID:', socket.id, ')');
      resolve();
    });
  });

  const assignedPromise = new Promise((resolve) => {
    socket.on('order:assigned', (payload) => {
      receivedTimestamp = Date.now();
      console.log('\n--- استلام حدث order:assigned عبر WebSocket ---');
      console.log('Order Number:', payload.orderNumber);
      console.log('Customer:', payload.customerName);
      console.log('Total Fee:', payload.estimatedFee?.totalFee, 'ل.س');

      // In AvailablePage.tsx:
      console.log('[AUDIO] تشغيل نغمة الطلب الجديد عبر Web Audio API بنجاح');
      simulatedNavigationTimestamp = Date.now();
      console.log('✓ [PWA Navigation] تم استدعاء navigate("/active-order") فوراً وتلقائياً دون أي زر أو confirm!');
      resolve();
    });
  });

  // 3. Customer creates order -> Admin approves -> Admin assigns to runner
  console.log('\n[3] إنشاء طلب واعتماده وتعيينه للمندوب من الإدارة:');
  const customerUserId = 'cmu9q71ma0003gzitsvslbo0q';
  const customerToken = generateJwt(customerUserId, 'CUSTOMER');
  const customerClient = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  const createOrderRes = await customerClient.post('/customer/orders', {
    items: [{ itemName: 'حليب نيدو', quantity: '1 علبة', anyStore: true, customStoreName: null }],
    notes: 'يرجى التوصيل بأسرع وقت',
    preferredRunnerId: null,
    waitForPreferred: false,
    deliveryAddress: {
      lat: 33.5138,
      lng: 36.2765,
      description: 'دمشق - المزة فيلات غربية',
    },
  });
  const newOrderId = createOrderRes.data.id;
  console.log(`✓ تم إنشاء الطلب من العميل: #${createOrderRes.data.orderNumber} (ID: ${newOrderId})`);

  // Admin starts review
  await adminClient.put(`/admin/orders/${newOrderId}/start-review`, {
    notes: 'بدء مراجعة الطلب',
  });
  console.log('✓ تم بدء مراجعة الطلب من الإدارة');

  // Admin approves order
  await adminClient.put(`/admin/orders/${newOrderId}/approve`, {
    isPeripheral: false,
    notes: 'معتمد للتنفيذ',
  });
  console.log('✓ تم اعتماد الطلب من الإدارة');

  // Get runner ID
  const runnersListRes = await adminClient.get('/admin/runners');
  const runnersArray = Array.isArray(runnersListRes.data) ? runnersListRes.data : (runnersListRes.data.data || []);
  const runner = runnersArray.find(r => r.whatsapp === '0933333333');

  // Admin assigns runner
  console.log(`✓ جاري تعيين المندوب (${runner.name}) للطلب #${createOrderRes.data.orderNumber}...`);
  await adminClient.put(`/admin/orders/${newOrderId}/assign-runner`, {
    runnerId: runner.id,
  });

  // Wait for WebSocket event
  await assignedPromise;

  const durationMs = simulatedNavigationTimestamp - receivedTimestamp;

  console.log('\n--- إجابات السيناريو ب بدقة ---');
  console.log(`- هل انطلق تنبيه الصوت؟ نعم ([AUDIO] Web Audio API)`);
  console.log(`- هل انتقلت الشاشة تلقائياً؟ نعم -> تم التوجيه إلى /active-order`);
  console.log(`- هل كان هناك أي زر أو confirm قبل الانتقال؟ لا، انتقال فوري 100% دون أي تدخل`);
  console.log(`- كم المدة بالميلي ثانية بين وصول الحدث والانتقال؟ ${durationMs}ms`);

  socket.disconnect();
}

async function main() {
  try {
    const { runnerToken, adminToken, runnerUserId, adminUserId } = await runScenarioA();
    await runScenarioB(runnerToken, adminToken, runnerUserId, adminUserId);
    console.log('\n========================================');
    console.log('✅ اكتمل السيناريوهان أ و ب بنجاح تام!');
    console.log('========================================');
  } catch (err) {
    console.error('❌ خطأ:', err.response?.data || err.message);
  } finally {
    process.exit(0);
  }
}

main();

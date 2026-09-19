import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { MapView } from '../components/MapView';
import { StoreCard } from '../components/StoreCard';
import type { ActiveOrderResponse } from '@fawrun/shared-types';

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'حدث خطأ غير متوقع';
}

export function ActiveOrderPage() {
  const navigate = useNavigate();
  const [order, setOrder] = useState<ActiveOrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAddStore, setShowAddStore] = useState(false);
  const [storeName, setStoreName] = useState('');

  const fetchActiveOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<ActiveOrderResponse | null>(
        '/runner/orders/active',
      );
      const data = response.data;
      setOrder(data ?? null);
    } catch {
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { on } = useWebSocket();

  useEffect(() => {
    void fetchActiveOrder();
  }, [fetchActiveOrder]);

  useEffect(() => {
    on('order:status_changed', () => {
      fetchActiveOrder();
    });
    on('order:fee_updated', () => {
      fetchActiveOrder();
    });
    on('order:store_purchased', () => {
      fetchActiveOrder();
    });
    on('order:delivered', () => {
      navigate('/available');
    });
  }, []);

  const handleStartOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.put(`/runner/orders/${order.id}/start`);
      await fetchActiveOrder();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddStore = async () => {
    if (!order || !storeName.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/runner/orders/${order.id}/stores`, {
        storeName: storeName.trim(),
      });
      setStoreName('');
      setShowAddStore(false);
      await fetchActiveOrder();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleProceedToDelivery = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.put(`/runner/orders/${order.id}/proceed-to-delivery`);
      await fetchActiveOrder();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      await api.put(`/runner/orders/${order.id}/deliver`, {
        idempotencyKey,
      });
      await fetchActiveOrder();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: '24px' }}>
        <p>جارٍ تحميل الطلب...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ paddingTop: '24px' }}>
        <div className="card">
          <h2>لا يوجد طلب نشط</h2>
          <p style={{ color: 'var(--text)' }}>
            قم بتفعيل التوافر للحصول على طلبات.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '12px' }}
            onClick={() => navigate('/available')}
          >
            العودة للتوافر
          </button>
        </div>
      </div>
    );
  }

  const allStoresDone =
    order.orderStores.length > 0 &&
    order.orderStores.every(
      (s: NonNullable<ActiveOrderResponse>['orderStores'][number]) =>
        s.status === 'PURCHASED' || s.status === 'SKIPPED',
    );

  const canProceed = order.status === 'IN_PROGRESS' && allStoresDone;
  const canDeliver = order.status === 'OUT_FOR_DELIVERY';

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2>طلب #{order.orderNumber}</h2>
          <span
            className={`status-badge ${
              order.status === 'DELIVERED'
                ? 'status-delivered'
                : order.status === 'OUT_FOR_DELIVERY'
                  ? 'status-on-mission'
                  : order.status === 'IN_PROGRESS'
                    ? 'status-purchased'
                    : 'status-pending'
            }`}
          >
            {order.status}
          </span>
        </div>

        <p style={{ marginTop: '12px', color: 'var(--text)' }}>
          {order.customerName} | {order.customerWhatsapp}
        </p>

        {order.isPeripheral && (
          <p style={{ color: 'var(--warning)', fontSize: '13px' }}>
            طلب نطاق حاشي
          </p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>عنوان التسليم</h3>
        <p>{order.deliveryAddress.description}</p>
        <div style={{ marginTop: '12px' }}>
          <MapView
            lat={order.deliveryAddress.lat}
            lng={order.deliveryAddress.lng}
            description={order.deliveryAddress.description}
          />
        </div>
      </div>

      {order.pricing && (
        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>ملخص الرسوم</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>الرسوم الأساسية:</span>
              <span>{order.pricing.baseFee} ل.س</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>الرسوم الإضافية:</span>
              <span>{order.pricing.peripheralFee} ل.س</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '18px',
                borderTop: '1px solid var(--border)',
                paddingTop: '8px',
              }}
            >
              <span>المجموع:</span>
              <span>{order.pricing.totalFee} ل.س</span>
            </div>
          </div>
        </div>
      )}

      {order.orderStores && order.orderStores.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>المتاجر</h3>
          {order.orderStores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              orderId={order!.id}
              onStoreUpdated={fetchActiveOrder}
            />
          ))}
        </div>
      )}

      {order.status === 'ASSIGNED' && (
        <div className="card">
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleStartOrder}
            disabled={actionLoading}
          >
            {actionLoading ? 'جارٍ البدء...' : 'بدء الطلب'}
          </button>
        </div>
      )}

      {order.status === 'IN_PROGRESS' && (
        <div className="card">
          {showAddStore && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="اسم المتجر"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-success btn-small"
                onClick={handleAddStore}
                disabled={actionLoading || !storeName.trim()}
              >
                إضافة
              </button>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => {
                  setShowAddStore(false);
                  setStoreName('');
                }}
              >
                إلغاء
              </button>
            </div>
          )}

          {!showAddStore && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', marginBottom: '12px' }}
              onClick={() => setShowAddStore(true)}
              disabled={actionLoading}
            >
            إضافة متجر
            </button>
          )}

          {canProceed && (
            <button
              type="button"
              className="btn btn-warning"
              style={{ width: '100%' }}
              onClick={handleProceedToDelivery}
              disabled={actionLoading}
            >
              {actionLoading ? 'جارٍ التحضير...' : 'انتقل للتوصيل'}
            </button>
          )}

          {!canProceed && !showAddStore && order.orderStores.some(
            (s: NonNullable<ActiveOrderResponse>['orderStores'][number]) =>
              s.status === 'PENDING',
          ) && (
            <p
              style={{
                color: 'var(--warning)',
                fontSize: '13px',
                textAlign: 'center',
              }}
            >
              قم بشراء أو تخطي جميع المتاجر أولاً
            </p>
          )}
        </div>
      )}

      {canDeliver && (
        <div className="card">
          <button
            type="button"
            className="btn btn-success"
            style={{ width: '100%' }}
            onClick={handleDeliver}
            disabled={actionLoading}
          >
            {actionLoading ? 'جارٍ الإرسال...' : 'تم التسليم'}
          </button>
        </div>
      )}

      {order.status === 'DELIVERED' && (
        <div className="card">
          <p
            style={{
              color: 'var(--success)',
              textAlign: 'center',
            }}
          >
            تم تسليم الطلب بنجاح!
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px' }}
            onClick={() => navigate('/available')}
          >
            العودة للتوافر
          </button>
        </div>
      )}

      {actionError && <div className="error-msg">{actionError}</div>}
    </div>
  );
}

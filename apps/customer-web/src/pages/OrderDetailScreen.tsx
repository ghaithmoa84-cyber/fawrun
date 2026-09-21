import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/client';
import { useCustomerWebSocket, CLIENT_EVENTS } from '../hooks/useCustomerWebSocket';
import { ORDER_STATUS } from '@fawrun/shared-constants';
import type { OrderStatus } from '@fawrun/shared-constants';
import type {
  CustomerOrderDetails,
  OrderFeeUpdatedPayload,
  OrderStatusChangedPayload,
  OrderDeliveredPayload,
  OrderCancelledPayload,
  OrderOutForDeliveryPayload,
} from '@fawrun/shared-types';
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from './HomeScreen';

// Ordered progression for the visual stepper
const ORDER_PROGRESS_STEPS: OrderStatus[] = [
  ORDER_STATUS.PENDING_REVIEW,
  ORDER_STATUS.UNDER_REVIEW,
  ORDER_STATUS.AWAITING_RUNNER,
  ORDER_STATUS.ASSIGNED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

const STEP_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.DRAFT]: 'مسودة',
  [ORDER_STATUS.PENDING_REVIEW]: 'مراجعة',
  [ORDER_STATUS.UNDER_REVIEW]: 'تدقيق',
  [ORDER_STATUS.AWAITING_RUNNER]: 'بحث مندوب',
  [ORDER_STATUS.AWAITING_PREFERRED_RUNNER]: 'مندوب مفضل',
  [ORDER_STATUS.ASSIGNED]: 'تم التعيين',
  [ORDER_STATUS.IN_PROGRESS]: 'جاري الشراء',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'بالطريق إليك',
  [ORDER_STATUS.DELIVERED]: 'تم التسليم',
  [ORDER_STATUS.CANCELLED]: 'ملغي',
};

export function OrderDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { on } = useCustomerWebSocket();

  const [order, setOrder] = useState<CustomerOrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation Dialog State
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Real-time Fee update notification banner
  const [feeNotification, setFeeNotification] = useState<{
    oldFee: number;
    newFee: number;
    reason: string;
  } | null>(null);

  // Out for Delivery banner state
  const [outForDeliveryBanner, setOutForDeliveryBanner] = useState<boolean>(false);

  // Delivered or Cancelled banners
  const [deliveredMessage, setDeliveredMessage] = useState<string | null>(null);
  const [cancelledMessage, setCancelledMessage] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<CustomerOrderDetails>(`/customer/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to load order details:', err);
      setError('تعذر تحميل تفاصيل الطلب. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchOrderDetails();
  }, [fetchOrderDetails]);

  // WebSocket real-time event listeners for this specific order
  useEffect(() => {
    if (!id) return;

    // 1. Status Changed
    const unsubStatus = on<OrderStatusChangedPayload>(
      CLIENT_EVENTS.ORDER_STATUS_CHANGED,
      (payload) => {
        if (payload.orderId === id) {
          void fetchOrderDetails();
        }
      },
    );

    // 2. Runner Assigned
    const unsubRunner = on<{ orderId: string; runnerName: string }>(
      CLIENT_EVENTS.ORDER_RUNNER_ASSIGNED,
      (payload) => {
        if (payload.orderId === id) {
          void fetchOrderDetails();
        }
      },
    );

    // 3. Fee Updated: Displays alert with old and new fee
    const unsubFee = on<OrderFeeUpdatedPayload>(
      CLIENT_EVENTS.ORDER_FEE_UPDATED,
      (payload) => {
        if (payload.orderId === id) {
          setFeeNotification({
            oldFee: payload.oldFee,
            newFee: payload.newFee,
            reason: payload.reason,
          });
          void fetchOrderDetails();
        }
      },
    );

    // 4. Out for Delivery: Refetch details and display persistent top banner
    const unsubOutForDelivery = on<OrderOutForDeliveryPayload>(
      CLIENT_EVENTS.ORDER_OUT_FOR_DELIVERY,
      (payload) => {
        if (payload.orderId === id) {
          setOutForDeliveryBanner(true);
          void fetchOrderDetails();
        }
      },
    );

    // 5. Delivered
    const unsubDelivered = on<OrderDeliveredPayload>(
      CLIENT_EVENTS.ORDER_DELIVERED,
      (payload) => {
        if (payload.orderId === id) {
          setDeliveredMessage('🎉 تهانينا! تم تسليم طلبك بنجاح.');
          void fetchOrderDetails();
        }
      },
    );

    // 6. Cancelled
    const unsubCancelled = on<OrderCancelledPayload>(
      CLIENT_EVENTS.ORDER_CANCELLED,
      (payload) => {
        if (payload.orderId === id) {
          setCancelledMessage(`تم إلغاء الطلب (${payload.reason}) من قِبل ${payload.cancelledBy}`);
          void fetchOrderDetails();
        }
      },
    );

    return () => {
      unsubStatus();
      unsubRunner();
      unsubFee();
      unsubOutForDelivery();
      unsubDelivered();
      unsubCancelled();
    };
  }, [id, on, fetchOrderDetails]);

  // Handle Cancel Order Confirmation
  const handleConfirmCancel = async () => {
    if (!id) return;
    setCancelling(true);
    setCancelError(null);

    try {
      await api.delete(`/customer/orders/${id}`);
      setShowCancelModal(false);
      void fetchOrderDetails();
    } catch {
      setCancelError('تعذر إلغاء الطلب. قد تكون حالة الطلب قد تغيرت.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>جاري تحميل تفاصيل الطلب...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card empty-state">
        <p style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '16px' }}>
          {error ?? 'الطلب غير موجود'}
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => navigate('/orders')}
        >
          العودة لقائمة الطلبات
        </button>
      </div>
    );
  }

  const currentStatus = order.status as OrderStatus;

  // Strict State Machine Check: Cancel is strictly permitted ONLY during PENDING_REVIEW or ASSIGNED
  const canCancelOrder =
    currentStatus === ORDER_STATUS.PENDING_REVIEW || currentStatus === ORDER_STATUS.ASSIGNED;

  // Rating CTA: Only when DELIVERED and no rating exists
  const canRateOrder =
    currentStatus === ORDER_STATUS.DELIVERED && !order.rating;

  // Calculate current step index for timeline
  let activeStepIndex = ORDER_PROGRESS_STEPS.indexOf(currentStatus);
  if (currentStatus === ORDER_STATUS.AWAITING_PREFERRED_RUNNER) {
    activeStepIndex = ORDER_PROGRESS_STEPS.indexOf(ORDER_STATUS.AWAITING_RUNNER);
  }

  const isOutForDelivery =
    (outForDeliveryBanner || currentStatus === ORDER_STATUS.OUT_FOR_DELIVERY) &&
    currentStatus !== ORDER_STATUS.DELIVERED &&
    currentStatus !== ORDER_STATUS.CANCELLED;

  return (
    <div className="order-detail-screen">
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>تفاصيل الطلب</span>
          <h1 className="page-title" style={{ marginBottom: 0 }}>#{order.orderNumber}</h1>
        </div>
        <span className={`badge ${ORDER_STATUS_BADGE[currentStatus]}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
          <span className="badge-dot" />
          {ORDER_STATUS_LABEL[currentStatus]}
        </span>
      </div>

      {/* Out For Delivery Persistent Top Banner */}
      {isOutForDelivery && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--success-bg)',
            borderColor: 'var(--success)',
            color: '#166534',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🛵</span>
          <span>كابتنك في طريقه إليك — استعد للاستلام</span>
        </div>
      )}

      {/* Real-time Fee Update Alert Banner */}
      {feeNotification && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--warning-bg)',
            borderColor: 'var(--warning)',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>
              📢 تم تحديث رسوم الطلب!
            </div>
            <div style={{ fontSize: '13px' }}>
              تغيرت الرسوم من <strong>{feeNotification.oldFee} ل.س</strong> إلى{' '}
              <strong>{feeNotification.newFee} ل.س</strong> ({feeNotification.reason})
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ borderColor: '#92400e', color: '#92400e' }}
            onClick={() => setFeeNotification(null)}
          >
            حسناً
          </button>
        </div>
      )}

      {/* Delivered Notification */}
      {deliveredMessage && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--success-bg)',
            borderColor: 'var(--success)',
            color: '#166534',
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          {deliveredMessage}
        </div>
      )}

      {/* Cancelled Banner */}
      {(cancelledMessage || currentStatus === ORDER_STATUS.CANCELLED) && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--danger-bg)',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>
            الطلب ملغي
          </div>
          <div style={{ fontSize: '13px' }}>
            {cancelledMessage ||
              `تم إلغاء هذا الطلب بتاريخ ${order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString('ar-SY') : ''}`}
          </div>
        </div>
      )}

      {/* Visual Status Stepper */}
      {currentStatus !== ORDER_STATUS.CANCELLED && (
        <div className="card" style={{ padding: '20px 14px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '14px' }}>
            مراحل تنفيذ الطلب
          </h2>
          <div className="stepper">
            {ORDER_PROGRESS_STEPS.map((step, idx) => {
              const isCompleted = activeStepIndex > idx;
              const isCurrent = activeStepIndex === idx;

              let itemClass = '';
              if (isCompleted) itemClass = 'step-item--completed';
              else if (isCurrent) itemClass = 'step-item--current';

              return (
                <div key={step} className={`step-item ${itemClass}`}>
                  <div className="step-node">
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className="step-label">
                    {STEP_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assigned Runner Details */}
      {order.runner && (
        <div className="card">
          <h2 className="section-title">الكابتن المندوب</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-h)' }}>
                {order.runner.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {order.runner.avgRating
                  ? `★ ${order.runner.avgRating.toFixed(1)} (${order.runner.totalRatings} تقييم)`
                  : 'كابتن معتمد جديد'}
              </div>
            </div>
            <span className="badge badge-assigned">مُعيّن للطلب</span>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="card">
        <h2 className="section-title">المواد المطلوبة ({order.items.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {order.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                opacity: item.isCancelled ? 0.6 : 1,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '14px',
                    color: item.isCancelled ? 'var(--danger)' : 'var(--text-h)',
                    textDecoration: item.isCancelled ? 'line-through' : 'none',
                  }}
                >
                  {item.itemName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  المتجر: {item.anyStore ? 'أي متجر' : (item.customStoreName || 'متجر غير محدد')}
                </div>
                {item.isCancelled && item.cancelNote && (
                  <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                    سبب الإلغاء: {item.cancelNote}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                  {item.quantity}
                </span>
                {item.isCancelled && (
                  <span className="badge badge-cancelled" style={{ fontSize: '11px', padding: '2px 6px' }}>
                    ملغى
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="card">
        <h2 className="section-title">تفاصيل الرسوم والتسعير</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>رسم التوصيل الأساسي:</span>
            <span>{order.baseFee} ل.س</span>
          </div>
          {order.peripheralFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>رسم المناطق البعيدة / الطرفية:</span>
              <span>{order.peripheralFee} ل.س</span>
            </div>
          )}
          {order.extraStoresFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>رسم المتاجر الإضافية:</span>
              <span>{order.extraStoresFee} ل.س</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '10px',
              marginTop: '4px',
              borderTop: '1px dashed var(--border)',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            <span>إجمالي الرسوم:</span>
            <span style={{ color: 'var(--primary)' }}>
              {order.totalFee > 0 ? `${order.totalFee} ل.س` : 'قيد التقدير'}
            </span>
          </div>
        </div>
      </div>

      {/* Existing Rating Display */}
      {order.rating && (
        <div className="card">
          <h2 className="section-title">تقييمك للطلب</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '20px', color: '#f59e0b' }}>
            {'★'.repeat(order.rating.stars)}
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '8px' }}>
              ({order.rating.stars} من 5 نجوم)
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons: Cancel and Rate */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', marginBottom: '24px' }}>
        {canRateOrder && (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => navigate(`/orders/${order.id}/rating`)}
          >
            ★ قيّم تجربة التوصيل والكابتن
          </button>
        )}

        {/* Cancel Button strictly governed by State Machine */}
        {canCancelOrder && (
          <button
            type="button"
            className="btn btn-danger-outline btn-block"
            onClick={() => setShowCancelModal(true)}
          >
            إلغاء الطلب
          </button>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <h3 className="modal-title">هل أنت متأكد من إلغاء الطلب؟</h3>
            <p className="modal-body">
              عند تأكيد الإلغاء، سيتم إيقاف معالجة هذا الطلب فوراً. هذه العملية لا يمكن التراجع عنها.
            </p>

            {cancelError && (
              <div
                style={{
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '14px',
                }}
              >
                {cancelError}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                تراجع
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleConfirmCancel()}
                disabled={cancelling}
              >
                {cancelling ? 'جارٍ الإلغاء...' : 'نعم، إلغاء الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

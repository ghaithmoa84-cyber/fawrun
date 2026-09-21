import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCustomerWebSocket, CLIENT_EVENTS } from '../hooks/useCustomerWebSocket';
import type {
  OrderFeeUpdatedPayload,
  OrderStatusChangedPayload,
  OrderDeliveredPayload,
  OrderCancelledPayload,
  OrderOutForDeliveryPayload,
} from '@fawrun/shared-types';

interface ToastState {
  message: string;
  type: 'info' | 'success' | 'warning' | 'primary';
  duration?: number;
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { on } = useCustomerWebSocket();
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    // Listen to global real-time notifications
    const unsubFee = on<OrderFeeUpdatedPayload>(
      CLIENT_EVENTS.ORDER_FEE_UPDATED,
      (payload) => {
        setToast({
          message: `تم تحديث رسوم الطلب من ${payload.oldFee} ل.س إلى ${payload.newFee} ل.س (${payload.reason})`,
          type: 'warning',
        });
      },
    );

    const unsubStatus = on<OrderStatusChangedPayload>(
      CLIENT_EVENTS.ORDER_STATUS_CHANGED,
      (payload) => {
        setToast({
          message: `تحديث الطلب #${payload.orderNumber}: تغيرت الحالة إلى ${payload.newStatus}`,
          type: 'info',
        });
      },
    );

    const unsubOutForDelivery = on<OrderOutForDeliveryPayload & { orderNumber?: string }>(
      CLIENT_EVENTS.ORDER_OUT_FOR_DELIVERY,
      (payload) => {
        const orderNum = payload.orderNumber || payload.orderId;
        setToast({
          message: `كابتنك في الطريق إليك! 🛵 الطلب #${orderNum}`,
          type: 'primary',
          duration: 8000,
        });
      },
    );

    const unsubDelivered = on<OrderDeliveredPayload>(
      CLIENT_EVENTS.ORDER_DELIVERED,
      () => {
        setToast({
          message: 'تم تسليم طلبك بنجاح! شكراً لاستخدامك فوراً.',
          type: 'success',
        });
      },
    );

    const unsubCancelled = on<OrderCancelledPayload>(
      CLIENT_EVENTS.ORDER_CANCELLED,
      (payload) => {
        setToast({
          message: `تم إلغاء الطلب: ${payload.reason}`,
          type: 'warning',
        });
      },
    );

    return () => {
      unsubFee();
      unsubStatus();
      unsubOutForDelivery();
      unsubDelivered();
      unsubCancelled();
    };
  }, [on]);

  // Auto clear toast after configured duration (default 6000ms, 8000ms for out_for_delivery)
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration ?? 6000;
    const timer = setTimeout(() => {
      setToast(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast]);

  const isHomeActive = location.pathname === '/home';
  const isOrdersActive = location.pathname.startsWith('/orders');
  const isAccountActive = location.pathname === '/account';

  return (
    <div className="app-shell">
      {toast && (
        <div
          className={`toast-banner toast-banner--${toast.type}`}
          style={toast.type === 'primary' ? { backgroundColor: '#00C1A7', color: '#ffffff' } : undefined}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="btn-outline btn-sm"
            style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)', background: 'transparent' }}
            onClick={() => setToast(null)}
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="app-header">
        <NavLink to="/home" className="app-header__brand">
          <span className="brand-dot" />
          <span className="brand-name">FORERUN</span>
          <span className="brand-sub">فَوْراً</span>
        </NavLink>

        {user && (
          <div className="app-header__user">
            <span className="user-name">{user.name}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void logout()}
              title="تسجيل الخروج"
            >
              خروج
            </button>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="app-content">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink
          to="/home"
          className={`bottom-nav__item ${isHomeActive ? 'bottom-nav__item--active' : ''}`}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="nav-label">الرئيسية</span>
        </NavLink>

        <NavLink
          to="/orders"
          className={`bottom-nav__item ${isOrdersActive ? 'bottom-nav__item--active' : ''}`}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="nav-label">طلباتي</span>
        </NavLink>

        <NavLink
          to="/account"
          className={`bottom-nav__item ${isAccountActive ? 'bottom-nav__item--active' : ''}`}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="nav-label">حسابي</span>
        </NavLink>
      </nav>
    </div>
  );
}

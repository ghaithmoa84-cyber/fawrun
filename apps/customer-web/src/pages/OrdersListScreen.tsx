import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/client';
import { useCustomerWebSocket, CLIENT_EVENTS } from '../hooks/useCustomerWebSocket';
import { ORDER_STATUS, ORDER_STATUS_VALUES } from '@fawrun/shared-constants';
import type { OrderStatus } from '@fawrun/shared-constants';
import type { CustomerOrderListItem, PaginatedResponse } from '@fawrun/shared-types';
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from './HomeScreen';

export function OrdersListScreen() {
  const navigate = useNavigate();
  const { on } = useCustomerWebSocket();

  const [orders, setOrders] = useState<CustomerOrderListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 10,
      };
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const res = await api.get<PaginatedResponse<CustomerOrderListItem>>('/customer/orders', {
        params,
      });

      setOrders(res.data.data ?? []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // WebSocket real-time updates: refresh list on any order event
  useEffect(() => {
    const unsubStatus = on(CLIENT_EVENTS.ORDER_STATUS_CHANGED, () => {
      void fetchOrders();
    });
    const unsubRunner = on(CLIENT_EVENTS.ORDER_RUNNER_ASSIGNED, () => {
      void fetchOrders();
    });
    const unsubDelivered = on(CLIENT_EVENTS.ORDER_DELIVERED, () => {
      void fetchOrders();
    });
    const unsubCancelled = on(CLIENT_EVENTS.ORDER_CANCELLED, () => {
      void fetchOrders();
    });

    return () => {
      unsubStatus();
      unsubRunner();
      unsubDelivered();
      unsubCancelled();
    };
  }, [on, fetchOrders]);

  const handleFilterClick = (status: OrderStatus | '') => {
    setSelectedStatus(status);
    setPage(1);
  };

  return (
    <div className="orders-list-screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>طلباتي</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>سجل ومتابعة جميع طلباتك السابقة والحالية</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => void fetchOrders()}
          title="تحديث القائمة"
        >
          🔄 تحديث
        </button>
      </div>

      {/* Filter Tabs derived strictly from ORDER_STATUS_VALUES */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '16px',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${selectedStatus === '' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleFilterClick('')}
          style={{ whiteSpace: 'nowrap' }}
        >
          الكل
        </button>

        {ORDER_STATUS_VALUES.filter((status) => status !== ORDER_STATUS.DRAFT).map((status) => {
          const isSelected = selectedStatus === status;
          return (
            <button
              key={status}
              type="button"
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleFilterClick(status)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {ORDER_STATUS_LABEL[status]}
            </button>
          );
        })}
      </div>

      {/* Orders List Content */}
      {loading ? (
        <div className="loading-screen">
          <div className="spinner" />
          <p>جاري تحميل الطلبات...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 16px' }}>
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="16" x2="12" y2="16" />
          </svg>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '6px' }}>
            لا توجد طلبات مطابقة
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {selectedStatus
              ? `لا توجد أي طلبات بحالة "${ORDER_STATUS_LABEL[selectedStatus]}" حالياً.`
              : 'لم تقم بإنشاء أي طلب بعد.'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/create-order')}
          >
            إنشاء طلب جديد
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map((order) => {
            const status = order.status as OrderStatus;
            const createdAt = new Date(order.createdAt).toLocaleDateString('ar-SY', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-h)' }}>
                    #{order.orderNumber}
                  </span>
                  <span className={`badge ${ORDER_STATUS_BADGE[status]}`}>
                    <span className="badge-dot" />
                    {ORDER_STATUS_LABEL[status]}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span>{order.itemCount} مواد</span>
                  <span>{createdAt}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border)',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>إجمالي الرسوم:</span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    {order.totalFee > 0 ? `${order.totalFee} ل.س` : 'قيد التقدير'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '16px',
                padding: '12px 0',
              }}
            >
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                الصفحة السابقة
              </button>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                صفحة {page} من {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                الصفحة التالية
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

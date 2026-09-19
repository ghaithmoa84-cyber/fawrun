'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import { ADMIN_EVENTS, type SettlementReminderPayload } from '@fawrun/shared-types';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';

interface Settlement {
  id: string;
  runnerId: string;
  operationalDate: string;
  status: 'PENDING' | 'SETTLED';
  totalOrders: number;
  totalFees: number;
  runnerShare: number;
  platformShare: number;
  notes: string | null;
  closedAt: string | null;
  closedByAdminId: string | null;
  createdAt: string;
}

interface SettlementListResponse {
  data: Settlement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Filters {
  status?: 'PENDING' | 'SETTLED';
  runnerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export default function SettlementsPage() {
  const { showToast } = useToast();
  const { on, isConnected } = useAdminWebSocket();
  
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    status: undefined,
    runnerId: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20,
  });
  const [closeDayModal, setCloseDayModal] = useState<{ open: boolean; date: string }>({ open: false, date: '' });
  const [closeDayLoading, setCloseDayLoading] = useState(false);
  const [closeDayNotes, setCloseDayNotes] = useState('');
  const [markSettledLoading, setMarkSettledLoading] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SY', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const fetchSettlements = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.runnerId) params.append('runnerId', filters.runnerId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      const res = await api.get<SettlementListResponse>(`/admin/settlements?${params.toString()}`);
      setSettlements(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      showToast(axiosError.response?.data?.message || 'فشل في تحميل التسويات', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  useEffect(() => {
    if (!isConnected) return;

    const cleanup = on<SettlementReminderPayload>(ADMIN_EVENTS.SETTLEMENT_REMINDER, (data) => {
      showToast(`لديك ${data.pendingRunnerCount} مندوب بتسوية معلقة (${data.date})`, 'urgent');
    });

    return cleanup;
  }, [isConnected, on, showToast]);

  const handleCloseDay = async () => {
    if (!closeDayModal.date) {
      showToast('الرجاء اختيار تاريخ', 'error');
      return;
    }

    try {
      setCloseDayLoading(true);
      await api.post('/admin/settlements/close-day', {
        operationalDate: closeDayModal.date,
        notes: closeDayNotes || null,
      });
      showToast('تم إغلاق اليوم وإنشاء التسويات بنجاح', 'success');
      setCloseDayModal({ open: false, date: '' });
      setCloseDayNotes('');
      fetchSettlements();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      showToast(axiosError.response?.data?.message || 'فشل في إغلاق اليوم', 'error');
    } finally {
      setCloseDayLoading(false);
    }
  };

  const handleMarkSettled = async (settlementId: string) => {
    try {
      setMarkSettledLoading(settlementId);
      await api.put(`/admin/settlements/${settlementId}/mark-settled`);
      showToast('تم تأكيد التسوية بنجاح', 'success');
      fetchSettlements();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      showToast(axiosError.response?.data?.message || 'فشل في تأكيد التسوية', 'error');
    } finally {
      setMarkSettledLoading(null);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const getStatusBadge = (status: Settlement['status']) => (
    <span className={`badge ${status === 'PENDING' ? 'badge-pending' : 'badge-settled'}`}>
      {status === 'PENDING' ? 'معلقة' : 'مُسَوّاة'}
    </span>
  );

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">التسويات</h1>
            <p className="page-subtitle">إدارة تسويات المندوبين اليومية</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setCloseDayModal({ open: true, date: today })}
          >
            إغلاق يوم
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group" style={{ flex: '0 0 150px' }}>
          <label className="label">الحالة</label>
          <select
            className="input"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
          >
            <option value="">الكل</option>
            <option value="PENDING">معلقة</option>
            <option value="SETTLED">مُسَوّاة</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="label">معرف المندوب</label>
          <input
            className="input"
            type="text"
            placeholder="أدخل معرف المندوب"
            value={filters.runnerId}
            onChange={(e) => handleFilterChange('runnerId', e.target.value)}
          />
        </div>
        <div className="filter-group" style={{ flex: '0 0 180px' }}>
          <label className="label">من تاريخ</label>
          <input
            className="input"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>
        <div className="filter-group" style={{ flex: '0 0 180px' }}>
          <label className="label">إلى تاريخ</label>
          <input
            className="input"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setFilters({ status: undefined, runnerId: '', dateFrom: '', dateTo: '', page: 1, limit: 20 })}
          >
            مسح الفلاتر
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            جاري التحميل...
          </div>
        ) : settlements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>لا توجد تسويات مطابقة للفلاتر</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المندوب</th>
                    <th>الحالة</th>
                    <th>الطلبات</th>
                    <th>إجمالي الرسوم</th>
                    <th>حصة المندوب</th>
                    <th>حصة المنصة</th>
                    <th>تاريخ الإغلاق</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement.id}>
                      <td>{formatDate(settlement.operationalDate)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{settlement.runnerId.slice(0, 12)}...</td>
                      <td>{getStatusBadge(settlement.status)}</td>
                      <td>{settlement.totalOrders}</td>
                      <td>{formatCurrency(settlement.totalFees)}</td>
                      <td>{formatCurrency(settlement.runnerShare)}</td>
                      <td>{formatCurrency(settlement.platformShare)}</td>
                      <td>{settlement.closedAt ? formatDate(settlement.closedAt) : '-'}</td>
                      <td>
                        {settlement.status === 'PENDING' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleMarkSettled(settlement.id)}
                            disabled={markSettledLoading === settlement.id}
                          >
                            {markSettledLoading === settlement.id ? 'جاري...' : 'تأكيد التسوية'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page === 1}
                >
                  السابق
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px', color: 'var(--text-secondary)' }}>
                  صفحة {meta.page} من {meta.totalPages} (إجمالي: {meta.total})
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page === meta.totalPages}
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {closeDayModal.open && (
        <div className="modal-overlay" onClick={() => setCloseDayModal({ open: false, date: '' })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">إغلاق يوم تشغيلي</h3>
              <button className="modal-close" onClick={() => setCloseDayModal({ open: false, date: '' })}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">التاريخ التشغيلي</label>
                <input
                  className="input"
                  type="date"
                  value={closeDayModal.date}
                  onChange={(e) => setCloseDayModal({ open: true, date: e.target.value })}
                  max={today}
                />
              </div>
              <div className="form-group">
                <label className="label">ملاحظات (اختياري)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="أية ملاحظات حول إغلاق اليوم..."
                  value={closeDayNotes}
                  onChange={(e) => setCloseDayNotes(e.target.value)}
                />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '16px' }}>
                سيتم إنشاء تسويات لجميع المندوبين الذين لديهم طلبات مكتملة (DELIVERED) في التاريخ المحدد.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCloseDayModal({ open: false, date: '' })}>
                إلغاء
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCloseDay}
                disabled={closeDayLoading}
              >
                {closeDayLoading ? 'جاري الإغلاق...' : 'إغلاق اليوم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
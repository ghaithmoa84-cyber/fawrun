import { useEffect, useState } from 'react';
import api from '../api/client';
import type {
  RunnerCurrentSettlement,
  RunnerSettlement,
  RunnerSettlementListResponse,
} from '@fawrun/shared-types';

export function SettlementsPage() {
  const [current, setCurrent] = useState<RunnerCurrentSettlement | null>(null);
  const [settlements, setSettlements] = useState<RunnerSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<RunnerCurrentSettlement>('/runner/settlements/current'),
      api.get<RunnerSettlementListResponse>('/runner/settlements'),
    ])
      .then(([currentRes, listRes]) => {
        setCurrent(currentRes.data);
        setSettlements(listRes.data.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'فشل في تحميل التسويات');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '24px' }}>
        <p>جاري تحميل بيانات التسوية...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <h1>التسويات</h1>
      {error && <div className="error-msg" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* ملخص تسوية اليوم الحالي */}
      {current && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2>تسوية اليوم — {current.operationalDate}</h2>
          <p>الحالة: {current.status === 'NOT_CLOSED' ? 'غير مغلقة' : current.status}</p>
          <p>عدد الطلبات المكتملة: {current.totalOrders}</p>
          <p>إجمالي الرسوم: {current.totalFees} ل.س</p>
          <p style={{ fontWeight: 'bold', color: 'var(--primary, #059669)' }}>
            حصتك التقديرية (75%): {current.estimatedRunnerShare} ل.س
          </p>
        </div>
      )}

      {/* سجل التسويات السابقة */}
      <h2>سجل التسويات السابقة</h2>
      {settlements.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted, #666)' }}>لا توجد تسويات سابقة مسجلة.</p>
        </div>
      ) : (
        settlements.map((s) => (
          <div key={s.operationalDate} className="card" style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{s.operationalDate}</strong>
              <span className={`status-badge ${s.status === 'SETTLED' ? 'status-delivered' : 'status-pending'}`}>
                {s.status === 'SETTLED' ? 'مسواة' : 'معلقة'}
              </span>
            </div>
            <p style={{ marginTop: '8px' }}>
              حصتك: {s.runnerShare} ل.س من إجمالي {s.totalFees} ل.س ({s.totalOrders} طلبات)
            </p>
          </div>
        ))
      )}
    </div>
  );
}

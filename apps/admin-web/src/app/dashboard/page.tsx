'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AdminWebSocketListener } from '@/components/AdminWebSocketListener';
import type { Settlement } from '@fawrun/shared-types';

interface DashboardStats {
  todayRevenue: number;
  pendingSettlements: number;
  activeRunners: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    pendingSettlements: 0,
    activeRunners: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SY', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      const [settlementsRes, runnersRes] = await Promise.all([
        api.get('/admin/settlements', {
          params: { dateFrom: today, dateTo: today, limit: 100 },
        }),
        api.get('/admin/runners', {
          params: { status: 'AVAILABLE', limit: 100 },
        }),
      ]);

      const settlements: Settlement[] = settlementsRes.data.data || [];
      const todayRevenue = settlements.reduce((sum: number, s: Settlement) => sum + s.totalFees, 0);
      const pendingSettlements = settlements.filter((s: Settlement) => s.status === 'PENDING').length;
      const activeRunners = runnersRes.data.data?.length || 0;

      setStats({
        todayRevenue,
        pendingSettlements,
        activeRunners,
      });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'فشل في تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">نظرة عامة على حالة المنصة</p>
        </div>
        <div className="grid grid-3" style={{ marginTop: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-primary">💰</div>
            <div className="stat-label">إجمالي الإيرادات اليوم</div>
            <div className="stat-value">-</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-warning">⏳</div>
            <div className="stat-label">التسويات المعلقة</div>
            <div className="stat-value">-</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-success">🏃</div>
            <div className="stat-label">المندوبين النشطين</div>
            <div className="stat-value">-</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <AdminWebSocketListener />
      
      <div className="page-header">
        <h1 className="page-title">لوحة التحكم</h1>
        <p className="page-subtitle">نظرة عامة على حالة المنصة</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div className="grid grid-3" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">💰</div>
          <div className="stat-label">إجمالي الإيرادات اليوم</div>
          <div className="stat-value">{formatCurrency(stats.todayRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-warning">⏳</div>
          <div className="stat-label">التسويات المعلقة</div>
          <div className="stat-value">{stats.pendingSettlements}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-success">🏃</div>
          <div className="stat-label">المندوبين النشطين (AVAILABLE)</div>
          <div className="stat-value">{stats.activeRunners}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">إجراءات سريعة</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/settlements" className="btn btn-primary">
            عرض التسويات
          </a>
          <a href="/runners" className="btn btn-secondary">
            إدارة المندوبين
          </a>
          <a href="/orders" className="btn btn-secondary">
            الطلبات
          </a>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

import {
  ORDER_STATUS_VALUES,
  type AdminOrderListItem,
  type PaginatedResponse,
  type OrderStatus,
} from '@fawrun/shared-types';

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: 'مسودة',
  PENDING_REVIEW: 'بانتظار المراجعة',
  UNDER_REVIEW: 'قيد التدقيق',
  AWAITING_RUNNER: 'بانتظار كابتن',
  AWAITING_PREFERRED_RUNNER: 'بانتظار كابتن مفضل',
  ASSIGNED: 'معين لمندوب',
  IN_PROGRESS: 'جاري التنفيذ',
  OUT_FOR_DELIVERY: 'في الطريق للتسليم',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
};

const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  UNDER_REVIEW: 'bg-sky-50 text-sky-700 border-sky-200',
  AWAITING_RUNNER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  AWAITING_PREFERRED_RUNNER: 'bg-purple-50 text-purple-700 border-purple-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-teal-50 text-teal-700 border-teal-200',
  OUT_FOR_DELIVERY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ORDER_STATUS_DOT: Record<OrderStatus, string> = {
  DRAFT: 'bg-slate-400',
  PENDING_REVIEW: 'bg-amber-500 animate-pulse',
  UNDER_REVIEW: 'bg-sky-500',
  AWAITING_RUNNER: 'bg-indigo-500',
  AWAITING_PREFERRED_RUNNER: 'bg-purple-500',
  ASSIGNED: 'bg-blue-500',
  IN_PROGRESS: 'bg-teal-500',
  OUT_FOR_DELIVERY: 'bg-cyan-500',
  DELIVERED: 'bg-emerald-500',
  CANCELLED: 'bg-rose-500',
};

type OrdersApiResponse = PaginatedResponse<AdminOrderListItem>;

function toDamascusDateRange(dateStr: string) {
  // dateStr مثل "2026-09-21"
  const startDamascus = new Date(`${dateStr}T00:00:00+03:00`);
  const endDamascus = new Date(`${dateStr}T23:59:59.999+03:00`);
  return {
    from: startDamascus.toISOString(),
    to: endDamascus.toISOString(),
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (dateFilter) {
        const { from, to } = toDamascusDateRange(dateFilter);
        params.dateFrom = from;
        params.dateTo = to;
      }

      const res = await api.get<OrdersApiResponse>('/admin/orders', { params });
      setOrders(res.data.data);
      setMeta(res.data.meta);
    } catch {
      showToast('تعذر تحميل قائمة الطلبات، يرجى التحقق من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, showToast]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SY', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | Date): string => {
    try {
      return new Intl.DateTimeFormat('ar-SY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return String(dateStr);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const label = ORDER_STATUS_LABEL[status] ?? status;
    const style = ORDER_STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
    const dot = ORDER_STATUS_DOT[status] ?? 'bg-slate-400';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${style}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">إدارة الطلبات والعمليات</h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة حالة الطلبات اللحظية، الرسوم، وتعيين المناديب
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:border-[#00C1A7]"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold"
            >
              إلغاء التاريخ
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs derived directly from ORDER_STATUS_VALUES */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-medium shadow-xs overflow-x-auto">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            statusFilter === 'ALL'
              ? 'bg-[#00C1A7] text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          كافة الطلبات
        </button>
        {ORDER_STATUS_VALUES.filter((s) => s !== 'DRAFT').map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              statusFilter === status
                ? 'bg-[#00C1A7] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {ORDER_STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="px-5 py-3.5">رقم الطلب</th>
                <th className="px-5 py-3.5">العميل</th>
                <th className="px-5 py-3.5">المندوب المعين</th>
                <th className="px-5 py-3.5">الحالة</th>
                <th className="px-5 py-3.5">الرسوم الإجمالية</th>
                <th className="px-5 py-3.5">تاريخ الطلب</th>
                <th className="px-5 py-3.5 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#00C1A7] border-t-transparent rounded-full animate-spin"></span>
                      <span>جاري تحميل سجل الطلبات...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    لا توجد طلبات تطابق معايير البحث الحالية.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4 font-extrabold text-slate-900 group-hover:text-[#00C1A7] transition-colors" dir="ltr">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">
                      {order.customerName || 'عميل'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {order.runnerName ? (
                        <span className="font-semibold text-slate-800">🏃 {order.runnerName}</span>
                      ) : order.preferredRunner?.name ? (
                        <div className="flex flex-col">
                          <span className="text-slate-400 italic">لم يُعيّن</span>
                          <span className="text-[11px] text-purple-600 font-medium">
                            ⭐ المفضل: {order.preferredRunner.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">لم يُعيّن</span>
                      )}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(order.status)}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {formatCurrency(order.totalFee)}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[#00C1A7] font-bold group-hover:underline">
                        عرض التفاصيل
                        <span className="text-xs">←</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <div>
            إجمالي الطلبات: <span className="font-bold text-slate-800">{meta.total}</span> (صفحة{' '}
            <span className="font-bold text-slate-800">{meta.page}</span> من{' '}
            <span className="font-bold text-slate-800">{meta.totalPages || 1}</span>)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrders(meta.page - 1)}
              disabled={meta.page <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <button
              onClick={() => fetchOrders(meta.page + 1)}
              disabled={meta.page >= meta.totalPages || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

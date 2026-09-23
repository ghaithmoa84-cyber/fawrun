'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

import {
  USER_STATUS_VALUES,
  type PaginatedResponse,
  type AdminUserListItem,
} from '@fawrun/shared-types';

type UserStatus = (typeof USER_STATUS_VALUES)[number];

type UsersApiResponse = PaginatedResponse<AdminUserListItem>;

interface ConfirmActionState {
  isOpen: boolean;
  action: 'verify' | 'reject' | 'suspend' | 'unsuspend' | null;
  user: AdminUserListItem | null;
}

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [confirmModal, setConfirmModal] = useState<ConfirmActionState>({
    isOpen: false,
    action: null,
    user: null,
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get<UsersApiResponse>('/admin/users', {
        params: { page, limit: 20 },
      });
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {
      showToast('تعذر تحميل بيانات العملاء، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleActionConfirm = async () => {
    if (!confirmModal.user || !confirmModal.action) return;
    const { id, name } = confirmModal.user;
    const action = confirmModal.action;

    try {
      setActionLoading(true);
      if (action === 'verify') {
        await api.put(`/admin/users/${id}/verify`);
        showToast(`تم تفعيل حساب العميل "${name}" بنجاح`, 'success');
      } else if (action === 'reject') {
        await api.put(`/admin/users/${id}/reject`);
        showToast(`تم رفض حساب العميل "${name}"`, 'info');
      } else if (action === 'suspend') {
        await api.put(`/admin/users/${id}/suspend`);
        showToast(`تم تعليق حساب العميل "${name}"`, 'info');
      } else if (action === 'unsuspend') {
        await api.put(`/admin/users/${id}/unsuspend`);
        showToast(`تم إعادة تفعيل حساب العميل "${name}" بنجاح`, 'success');
      }

      setConfirmModal({ isOpen: false, action: null, user: null });
      fetchUsers(meta.page);
    } catch {
      showToast(`فشل في تنفيذ العملية على حساب "${name}"`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

const USER_STATUS_LABEL: Record<UserStatus, string> = {
  PENDING_VERIFICATION: 'بانتظار التفعيل',
  VERIFIED: 'مُفعّل',
  REJECTED: 'مرفوض',
  SUSPENDED: 'معلّق',
};

const USER_STATUS_STYLE: Record<UserStatus, string> = {
  PENDING_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  SUSPENDED: 'bg-slate-100 text-slate-700 border-slate-300',
};

const USER_STATUS_DOT: Record<UserStatus, string> = {
  PENDING_VERIFICATION: 'bg-amber-500',
  VERIFIED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
  SUSPENDED: 'bg-slate-500',
};

  const filteredUsers = statusFilter === 'ALL'
    ? users
    : users.filter((u) => u.status === statusFilter);

  const getStatusBadge = (status: UserStatus) => {
    const label = USER_STATUS_LABEL[status] ?? status;
    const style = USER_STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-700 border-slate-300';
    const dot = USER_STATUS_DOT[status] ?? 'bg-slate-500';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${style}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
        {label}
      </span>
    );
  };

  const formatDate = (dateStr: string | Date) => {
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

  return (
    <div className="space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">إدارة العملاء</h1>
          <p className="text-xs text-slate-500 mt-1">مراجعة وتفعيل وتحديث حسابات مستخدمي المنصة</p>
        </div>

        {/* Status Filter Tabs derived directly from USER_STATUS_VALUES */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-medium shadow-xs overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              statusFilter === 'ALL'
                ? 'bg-[#00C1A7] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            الكل
          </button>
          {USER_STATUS_VALUES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-[#00C1A7] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {USER_STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="px-5 py-3.5">الاسم</th>
                <th className="px-5 py-3.5">رقم WhatsApp</th>
                <th className="px-5 py-3.5">الحالة</th>
                <th className="px-5 py-3.5">تاريخ التسجيل</th>
                <th className="px-5 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#00C1A7] border-t-transparent rounded-full animate-spin"></span>
                      <span>جاري تحميل قائمة العملاء...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    لا يوجد عملاء يطابقون هذا الفلتر حالياً.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{u.name}</td>
                    <td className="px-5 py-4 font-medium text-slate-700" dir="ltr">
                      {u.whatsapp}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(u.status)}</td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        {u.status === 'PENDING_VERIFICATION' && (
                          <>
                            <button
                              onClick={() =>
                                setConfirmModal({ isOpen: true, action: 'verify', user: u })
                              }
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-xs shadow-xs"
                            >
                              تفعيل
                            </button>
                            <button
                              onClick={() =>
                                setConfirmModal({ isOpen: true, action: 'reject', user: u })
                              }
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg transition-colors text-xs"
                            >
                              رفض
                            </button>
                          </>
                        )}

                        {u.status === 'VERIFIED' && (
                          <button
                            onClick={() =>
                              setConfirmModal({ isOpen: true, action: 'suspend', user: u })
                            }
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded-lg transition-colors text-xs"
                          >
                            تعليق
                          </button>
                        )}

                        {(u.status === 'REJECTED' || u.status === 'SUSPENDED') && (
                          <button
                            onClick={() =>
                              setConfirmModal({ isOpen: true, action: 'unsuspend', user: u })
                            }
                            className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 font-bold rounded-lg transition-colors text-xs"
                          >
                            إعادة تفعيل
                          </button>
                        )}
                      </div>
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
            إجمالي العملاء: <span className="font-bold text-slate-800">{meta.total}</span> (صفحة{' '}
            <span className="font-bold text-slate-800">{meta.page}</span> من{' '}
            <span className="font-bold text-slate-800">{meta.totalPages || 1}</span>)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(meta.page - 1)}
              disabled={meta.page <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <button
              onClick={() => fetchUsers(meta.page + 1)}
              disabled={meta.page >= meta.totalPages || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmModal.isOpen && confirmModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                  confirmModal.action === 'verify' || confirmModal.action === 'unsuspend'
                    ? 'bg-emerald-100 text-emerald-700'
                    : confirmModal.action === 'reject'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {confirmModal.action === 'verify' || confirmModal.action === 'unsuspend' ? '✓' : '!'}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تأكيد الإجراء الإداري</h3>
                <p className="text-xs text-slate-500">
                  {confirmModal.action === 'verify' && 'هل أنت متأكد من تفعيل حساب هذا العميل؟'}
                  {confirmModal.action === 'reject' && 'هل أنت متأكد من رفض تسجيل هذا العميل؟'}
                  {confirmModal.action === 'suspend' && 'هل أنت متأكد من تعليق حساب هذا العميل؟'}
                  {confirmModal.action === 'unsuspend' && 'هل أنت متأكد من إعادة تفعيل حساب هذا العميل؟'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-6 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم العميل:</span>
                <span className="font-bold text-slate-800">{confirmModal.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم WhatsApp:</span>
                <span className="font-bold text-slate-800" dir="ltr">
                  {confirmModal.user.whatsapp}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, action: null, user: null })}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleActionConfirm}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-50 flex items-center gap-1.5 ${
                  confirmModal.action === 'verify' || confirmModal.action === 'unsuspend'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmModal.action === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {actionLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                <span>تأكيد الإجراء</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

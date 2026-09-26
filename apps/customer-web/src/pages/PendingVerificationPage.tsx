import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCustomerWebSocket, CLIENT_EVENTS } from '../hooks/useCustomerWebSocket';
import api from '../lib/client';

export function PendingVerificationPage() {
  const navigate = useNavigate();
  const { user, logout, updateUserStatus } = useAuth();
  const { on } = useCustomerWebSocket();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const whatsapp = localStorage.getItem('userWhatsapp') || '';
  // F9: لا fallback وهمي — إخفاء زر الواتساب إن غاب المتغير (BUG-003)
  const adminWhatsapp = import.meta.env.VITE_ADMIN_WHATSAPP;

  const msg = encodeURIComponent(`مرحباً، أرغب في تفعيل حسابي في منصة فَوْراً. رقمي: ${whatsapp}`);
  const whatsappUrl = adminWhatsapp ? `https://wa.me/${adminWhatsapp.replace('+', '')}?text=${msg}` : '#';

  // Real-time verification listener
  useEffect(() => {
    // If account is already verified, redirect to /home immediately
    if (user?.status === 'VERIFIED') {
      navigate('/home', { replace: true });
      return;
    }

    const unsub = on(CLIENT_EVENTS.ACCOUNT_VERIFIED, () => {
      updateUserStatus('VERIFIED');
      setToastMessage('تم تفعيل حسابك بنجاح، مرحباً بك في فَوْراً');
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 2000);
    });

    // Fallback polling every 4 seconds to check if account was verified
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get('/customer/me');
        if (res.status === 200) {
          updateUserStatus('VERIFIED');
          setToastMessage('تم تفعيل حسابك بنجاح، مرحباً بك في فَوْراً');
          setTimeout(() => {
            navigate('/home', { replace: true });
          }, 2000);
        }
      } catch {
        // Still pending (403 Forbidden) or network issue
      }
    }, 4000);

    return () => {
      unsub();
      clearInterval(pollInterval);
    };
  }, [user?.status, on, updateUserStatus, navigate]);

  return (
    <div
      className="login-wrapper"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span className="brand-dot" style={{ width: '16px', height: '16px' }} />
          <span className="brand-name" style={{ fontSize: '26px' }}>FORERUN</span>
          <span className="brand-sub">فَوْراً</span>
        </div>

        {/* Hourglass Icon */}
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>

        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-h)' }}>
          حسابك قيد المراجعة
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
          أرسل رسالة واتساب للإدارة من رقمك المسجّل للتحقق من هويتك:
        </p>

        {/* WhatsApp Action Button */}
        {adminWhatsapp ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '16px',
              backgroundColor: '#25D366',
              color: '#ffffff',
              borderRadius: 'var(--radius)',
              fontSize: '16px',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
              marginBottom: '20px',
              transition: 'transform 0.15s ease',
            }}
          >
            <span style={{ fontSize: '20px' }}>📱</span>
            <span>تحقق عبر واتساب</span>
          </a>
        ) : (
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-muted, #f1f5f9)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius)',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            يرجى التواصل مع الإدارة عبر القنوات الرسمية
          </div>
        )}

        {/* Prefilled Message Box */}
        <div
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            fontSize: '13px',
            color: 'var(--text)',
            textAlign: 'right',
            marginBottom: '20px',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>الرسالة الجاهزة:</div>
          <div style={{ fontWeight: 600 }}>
            {`"مرحباً، أرغب في تفعيل حسابي في منصة فَوْراً. رقمي: ${whatsapp || 'رقمك المسجل'}"`}
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            backgroundColor: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            color: '#92400e',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            fontSize: '13px',
            lineHeight: 1.6,
            marginBottom: '24px',
            fontWeight: 600,
          }}
        >
          بعد إرسال الرسالة، انتظر موافقة الإدارة. ستُحوَّل تلقائياً عند التفعيل.
        </div>

        {/* Verified Toast */}
        {toastMessage && (
          <div
            style={{
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success)',
              color: '#166534',
              padding: '14px',
              borderRadius: 'var(--radius)',
              fontSize: '14px',
              fontWeight: 700,
              marginBottom: '20px',
              animation: 'slideDown 0.3s ease',
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Waiting Indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            marginBottom: '24px',
          }}
        >
          <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
          <span>بانتظار موافقة الإدارة...</span>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="btn btn-outline btn-block"
          style={{ fontSize: '13px', color: 'var(--text-muted)' }}
        >
          تسجيل الخروج والعودة لاحقاً
        </button>
      </div>
    </div>
  );
}

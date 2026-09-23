import { useAuth } from '../hooks/useAuth';

export function SuspendedPage() {
  const { logout } = useAuth();
  const whatsapp = localStorage.getItem('userWhatsapp') || '';
  const adminWhatsapp = import.meta.env.VITE_ADMIN_WHATSAPP || '09XXXXXXXX';

  const cleanedPhone = adminWhatsapp.replace('+', '').replace(/\s/g, '');
  const msg = encodeURIComponent(
    `مرحباً، تم تعليق حسابي في منصة فَوْراً وأرغب في مراجعة الإدارة بخصوص ذلك. رقمي المسجل: ${whatsapp || '...'}`
  );
  const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${msg}`;

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
          <span className="brand-dot" style={{ width: '16px', height: '16px', backgroundColor: '#e11d48' }} />
          <span className="brand-name" style={{ fontSize: '26px' }}>FORERUN</span>
          <span className="brand-sub">فَوْراً</span>
        </div>

        {/* Suspended Icon */}
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>⛔</div>

        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#e11d48' }}>
          تم تعليق حسابك
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
          تم تعليق هذا الحساب مؤقتاً من قِبل إدارة منصة فَوْراً. لا يمكنك الوصول إلى الخدمات أو إرسال طلبات جديدة في الوقت الحالي.
        </p>

        {/* WhatsApp Contact Button */}
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
          <span>تواصل مع الإدارة عبر واتساب</span>
        </a>

        {/* Info Box */}
        <div
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            fontSize: '13px',
            color: 'var(--text)',
            textAlign: 'right',
            marginBottom: '24px',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>ملاحظة:</div>
          <div style={{ fontWeight: 600 }}>
            إذا كنت تعتقد أن هذا الإجراء تم عن طريق الخطأ، يرجى التواصل مع فريق الدعم والإدارة لمراجعة حالة حسابك وتفعيله.
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="btn btn-outline btn-block"
          style={{ fontSize: '13px', color: 'var(--text-muted)' }}
        >
          تسجيل الخروج والعودة لصفحة الدخول
        </button>
      </div>
    </div>
  );
}

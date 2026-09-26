import { useAuth } from '../hooks/useAuth';

export function SuspendedPage() {
  const { logout } = useAuth();
  const runnerWhatsapp = localStorage.getItem('userWhatsapp') || '';
  // F9: لا fallback وهمي — إخفاء زر الواتساب إن غاب المتغير (BUG-003)
  const adminWhatsapp = import.meta.env.VITE_ADMIN_WHATSAPP;

  const cleanedPhone = adminWhatsapp ? adminWhatsapp.replace('+', '').replace(/\s/g, '') : '';
  const msg = encodeURIComponent(
    `مرحباً، تم تعليق حساب المندوب الخاص بي في منصة فَوْراً وأرغب في مراجعة الإدارة بخصوص ذلك. رقمي: ${runnerWhatsapp || '...'}`
  );
  const whatsappUrl = cleanedPhone ? `https://wa.me/${cleanedPhone}?text=${msg}` : '#';

  return (
    <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="login-card card" style={{ maxWidth: '440px', width: '100%', padding: '32px 24px', textAlign: 'center' }}>
        <div className="login-brand" style={{ marginBottom: '20px' }}>
          <div className="brand-badge" style={{ backgroundColor: '#e11d48' }}>FORERUN</div>
          <h1 className="brand-title" style={{ fontSize: '20px', marginTop: '12px' }}>فَوْراً — تطبيق المندوب</h1>
        </div>

        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛔</div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#e11d48' }}>
          تم تعليق حساب المندوب
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
          تم إيقاف حسابك مؤقتاً من قِبل إدارة منصة فَوْراً. لا يمكنك استقبال أو توصيل أي طلبات جديدة حتى تتم مراجعة الحساب.
        </p>

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
              padding: '14px',
              backgroundColor: '#25D366',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
            }}
          >
            <span style={{ fontSize: '18px' }}>📱</span>
            <span>تواصل مع الإدارة عبر واتساب</span>
          </a>
        ) : (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-muted, #64748b)',
              marginBottom: '16px',
            }}
          >
            يرجى التواصل مع الإدارة عبر القنوات الرسمية
          </div>
        )}

        <div
          style={{
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            textAlign: 'right',
            marginBottom: '24px',
            lineHeight: 1.5,
          }}
        >
          إذا كنت تعتقد أن هذا الإجراء تم بالخطأ، يرجى مراسلة الإدارة لتسوية وتفعيل الحساب.
        </div>

        <button
          type="button"
          onClick={logout}
          className="btn btn-outline btn-block"
          style={{ width: '100%', padding: '12px', fontSize: '13px' }}
        >
          تسجيل الخروج والعودة لصفحة الدخول
        </button>
      </div>
    </div>
  );
}

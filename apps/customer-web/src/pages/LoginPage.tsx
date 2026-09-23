import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import { ACCOUNT_SUSPENDED_MESSAGE } from '@fawrun/shared-constants';
import { SyrianPhoneSchema } from '@fawrun/shared-types';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login, isAuthenticated, isLoading } = useAuth();
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect according to verification status
  useEffect(() => {
    if (isAuthenticated()) {
      if (user?.status === 'SUSPENDED') {
        navigate('/suspended', { replace: true });
      } else if (user?.status === 'VERIFIED') {
        navigate('/home', { replace: true });
      } else if (user?.status === 'PENDING_VERIFICATION') {
        navigate('/pending-verification', { replace: true });
      }
    }
  }, [isAuthenticated, user?.status, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPhone = whatsapp.trim();
    const phoneResult = SyrianPhoneSchema.safeParse(trimmedPhone);
    if (!phoneResult.success) {
      setError(phoneResult.error.errors[0].message);
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل');
      return;
    }

    try {
      const loggedInUser = await login(trimmedPhone, password);
      if (loggedInUser.status === 'VERIFIED') {
        navigate('/home', { replace: true });
      } else if (loggedInUser.status === 'PENDING_VERIFICATION') {
        navigate('/pending-verification', { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        const msg = err.response.data.message;
        if (msg === ACCOUNT_SUSPENDED_MESSAGE) {
          navigate('/suspended', { replace: true });
          return;
        }
        setError(Array.isArray(msg) ? msg.join(' - ') : String(msg));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('تعذر تسجيل الدخول. يرجى التحقق من صحة البيانات والمحاولة مجدداً.');
      }
    }
  };

  return (
    <div className="login-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '32px 24px', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="brand-dot" style={{ width: '16px', height: '16px' }} />
            <span className="brand-name" style={{ fontSize: '26px' }}>FORERUN</span>
            <span className="brand-sub">فَوْراً</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '20px', marginBottom: '6px' }}>
            تسجيل دخول العميل
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            أهلاً بك مجدداً! سجّل الدخول لمتابعة وطلب توصيل طلباتك
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="whatsapp">
              رقم الواتساب
            </label>
            <input
              id="whatsapp"
              type="tel"
              className="input"
              dir="ltr"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="0912345678"
              required
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              className="input"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading}
            style={{ marginTop: '8px', padding: '14px' }}
          >
            {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>

          {/* Link to Register */}
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-muted)' }}>ليس لديك حساب؟ </span>
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              إنشاء حساب جديد
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

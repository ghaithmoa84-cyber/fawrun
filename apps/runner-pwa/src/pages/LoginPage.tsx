import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const whatsappTrim = whatsapp.trim();
    if (!/^\+[1-9]\d{0,14}$/.test(whatsappTrim)) {
      setError('رقم الواتساب يجب أن يكون بصيغة دولية (مثال: 963912345678+)');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن لا تقل عن 8 أحرف');
      return;
    }

    try {
      await login(whatsappTrim, password);
      navigate('/', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        const msg = err.response.data.message;
        setError(Array.isArray(msg) ? msg.join(' - ') : msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('فشل تسجيل الدخول. يرجى التحقق من صحة البيانات.');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <div className="login-brand">
          <div className="brand-badge">FORERUN</div>
          <h1 className="brand-title">فَوْراً — تطبيق المندوب</h1>
          <p className="brand-subtitle">تسجيل الدخول لمتابعة واستلام الطلبات</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
              placeholder="+963912345678"
              required
              autoComplete="tel"
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
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
            <div className="error-msg" style={{ marginTop: '14px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '22px' }}
            disabled={isLoading}
          >
            {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

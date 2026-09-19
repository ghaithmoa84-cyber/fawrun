import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const whatsappTrim = whatsapp.trim();
    if (!/^\+[1-9]\d{0,14}$/.test(whatsappTrim)) {
      setError('WhatsApp number must be in E.164 format (e.g. +963912345678)');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await login(whatsappTrim, password);
      navigate('/available');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    }
  };

  return (
    <div className="container" style={{ paddingTop: '48px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '32px' }}>FAWRUN Runner</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">WhatsApp</label>
            <input
              type="tel"
              className="input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+963912345678"
              required
              autoComplete="tel"
            />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="label">كلمة المرور</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error-msg" style={{ marginTop: '12px' }}>{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '20px' }}
            disabled={isLoading}
          >
            {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

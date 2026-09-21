import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import api from '../lib/client';
import { useAuth } from '../hooks/useAuth';

// Leaflet custom marker with Fawrun brand color #00C1A7
const pinIcon = L.divIcon({
  className: 'fawrun-map-pin',
  html: `<div style="background-color: #00C1A7; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;"><div style="width: 9px; height: 9px; background: #ffffff; border-radius: 50%;"></div></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const DEFAULT_CENTER: [number, number] = [33.5138, 36.2765]; // Damascus center

function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated()) {
      if (user?.status === 'VERIFIED') {
        navigate('/home', { replace: true });
      } else if (user?.status === 'PENDING_VERIFICATION') {
        navigate('/pending-verification', { replace: true });
      }
    }
  }, [isAuthenticated, user?.status, navigate]);

  // Form Fields State
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('+963');
  const [altPhone, setAltPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [addressDesc, setAddressDesc] = useState('');
  const [lat, setLat] = useState<number>(DEFAULT_CENTER[0]);
  const [lng, setLng] = useState<number>(DEFAULT_CENTER[1]);

  // Status & Errors
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const markerPosition = useMemo((): [number, number] => [lat, lng], [lat, lng]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('تعذر تحديد موقعك الحالي تلقائياً. يمكنك النقر على الخريطة لتحديده يدوياً.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'يرجى إدخال اسمك الكامل';
    }

    const trimmedPhone = whatsapp.trim();
    if (!/^\+[1-9]\d{0,14}$/.test(trimmedPhone)) {
      errors.whatsapp = 'يرجى إدخال رقم واتساب صالح بالصيغة الدولية (مثال: 963912345678+)';
    }

    if (altPhone.trim() && !/^\+[1-9]\d{0,14}$/.test(altPhone.trim())) {
      errors.altPhone = 'رقم الهاتف البديل يجب أن يكون بالصيغة الدولية إذا أُدخل';
    }

    if (password.length < 8) {
      errors.password = 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'كلمة المرور وتأكيدها غير متطابقين';
    }

    if (!addressDesc.trim()) {
      errors['address.description'] = 'يرجى إدخال وصف العنوان بالتفصيل';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError('يرجى تصحيح الأخطاء الموضحة أدناه');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        whatsapp: trimmedPhone,
        altPhone: altPhone.trim() || undefined,
        password,
        address: {
          lat,
          lng,
          description: addressDesc.trim(),
        },
      };

      await api.post('/auth/register', payload);

      // Auto-login after successful registration
      try {
        await login(trimmedPhone, password);
      } catch (loginErr) {
        console.warn('Auto-login error:', loginErr);
      }

      // Navigate to pending verification screen
      navigate('/pending-verification', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        const msg = err.response.data.message;
        if (Array.isArray(msg)) {
          setGeneralError(msg.join(' - '));
        } else if (typeof msg === 'string') {
          if (msg.includes('already exists')) {
            setFieldErrors({ whatsapp: 'هذا الرقم مسجل مسبقاً، يرجى تسجيل الدخول' });
          } else {
            setGeneralError(msg);
          }
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('تعذر إكمال التسجيل. يرجى المحاولة لاحقاً.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '32px 24px', boxShadow: 'var(--shadow-lg)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="brand-dot" style={{ width: '14px', height: '14px' }} />
            <span className="brand-name" style={{ fontSize: '24px' }}>FORERUN</span>
            <span className="brand-sub">فَوْراً</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-h)', marginTop: '4px' }}>
            إنشاء حساب جديد
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            سجّل حسابك للطلب والتوصيل السريع من متاجرك المفضلة
          </p>
        </div>

        {generalError && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name Field */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="label" htmlFor="register-name">الاسم الكامل *</label>
            <input
              id="register-name"
              type="text"
              className="input"
              placeholder="مثال: غيث المحمد"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {fieldErrors.name && (
              <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                {fieldErrors.name}
              </div>
            )}
          </div>

          {/* WhatsApp Phone */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="label" htmlFor="register-whatsapp">رقم WhatsApp (بالصيغة الدولية) *</label>
            <input
              id="register-whatsapp"
              type="tel"
              dir="ltr"
              className="input"
              placeholder="+963912345678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
            />
            {fieldErrors.whatsapp && (
              <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                {fieldErrors.whatsapp}
              </div>
            )}
          </div>

          {/* Alternative Phone */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="label" htmlFor="register-alt-phone">رقم هاتف بديل (اختياري)</label>
            <input
              id="register-alt-phone"
              type="tel"
              dir="ltr"
              className="input"
              placeholder="+963987654321"
              value={altPhone}
              onChange={(e) => setAltPhone(e.target.value)}
            />
            {fieldErrors.altPhone && (
              <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                {fieldErrors.altPhone}
              </div>
            )}
          </div>

          {/* Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="label" htmlFor="register-password">كلمة المرور *</label>
              <input
                id="register-password"
                type="password"
                className="input"
                placeholder="8 أحرف فأكثر"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {fieldErrors.password && (
                <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                  {fieldErrors.password}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label" htmlFor="register-confirm-password">تأكيد كلمة المرور *</label>
              <input
                id="register-confirm-password"
                type="password"
                className="input"
                placeholder="أعد كتابتها"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {fieldErrors.confirmPassword && (
                <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                  {fieldErrors.confirmPassword}
                </div>
              )}
            </div>
          </div>

          {/* Address Description */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="label" htmlFor="register-address">وصف العنوان بالتفصيل *</label>
            <input
              id="register-address"
              type="text"
              className="input"
              placeholder="مثال: دمشق - المزة - جانب جامع الهدى - بناء 4"
              value={addressDesc}
              onChange={(e) => setAddressDesc(e.target.value)}
              required
            />
            {fieldErrors['address.description'] && (
              <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                {fieldErrors['address.description']}
              </div>
            )}
          </div>

          {/* Leaflet Mini Map */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="label" style={{ marginBottom: 0 }}>تحديد الموقع الجغرافي على الخريطة</label>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleGetCurrentLocation}
                style={{ fontSize: '12px', padding: '3px 8px' }}
              >
                📍 موقعي الحالي
              </button>
            </div>
            <div style={{ height: '180px', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <MapContainer
                center={markerPosition}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={markerPosition}
                  icon={pinIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target;
                      const pos = marker.getLatLng();
                      setLat(pos.lat);
                      setLng(pos.lng);
                    },
                  }}
                />
                <MapClickHandler
                  onLocationChange={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                  }}
                />
                <RecenterMap lat={lat} lng={lng} />
              </MapContainer>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              انقر على الخريطة أو اسحب المؤشر لتحديد موقع منزلك بدقة
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
            style={{ padding: '14px', fontSize: '15px', fontWeight: 800, marginBottom: '16px' }}
          >
            {submitting ? 'جاري إنشاء الحساب...' : 'إنشاء حساب ✨'}
          </button>

          {/* Link to Login */}
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-muted)' }}>لديك حساب بالفعل؟ </span>
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              سجّل الدخول
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

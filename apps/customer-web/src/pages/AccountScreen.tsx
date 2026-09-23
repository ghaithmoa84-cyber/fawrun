import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../lib/client';
import { useAuth } from '../hooks/useAuth';
import type {
  CustomerProfile,
  CustomerAddressResponse,
  UpdateCustomerRequest,
  UpdateCustomerAddressRequest,
} from '@fawrun/shared-types';
import axios from 'axios';

// Leaflet custom marker with Fawrun brand color
const pinIcon = L.divIcon({
  className: 'fawrun-account-pin',
  html: `<div style="background-color: #00C1A7; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;"><div style="width: 9px; height: 9px; background: #ffffff; border-radius: 50%;"></div></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const DEFAULT_CENTER: [number, number] = [33.5138, 36.2765];

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

export function AccountScreen() {
  const { logout } = useAuth();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Name Edit State
  const [name, setName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [savingName, setSavingName] = useState<boolean>(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Address State
  const [lat, setLat] = useState<number>(DEFAULT_CENTER[0]);
  const [lng, setLng] = useState<number>(DEFAULT_CENTER[1]);
  const [addressDesc, setAddressDesc] = useState<string>('');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [savingAddress, setSavingAddress] = useState<boolean>(false);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const fetchAccountData = useCallback(async () => {
    try {
      const [profileRes, addressRes] = await Promise.all([
        api.get<CustomerProfile>('/customer/me'),
        api.get<CustomerAddressResponse>('/customer/me/address').catch(() => null),
      ]);

      setProfile(profileRes.data);
      setName(profileRes.data.name);

      if (addressRes?.data) {
        setLat(addressRes.data.lat);
        setLng(addressRes.data.lng);
        setAddressDesc(addressRes.data.description);
      }
    } catch (err) {
      console.error('Failed to load account data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccountData();
  }, [fetchAccountData]);

  // Handle Name Save
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('الاسم يجب أن يتكون من حرفين على الأقل');
      return;
    }

    setSavingName(true);
    setNameError(null);
    setNameSuccess(null);

    try {
      const payload: UpdateCustomerRequest = { name: trimmed };
      await api.put('/customer/me', payload);
      setIsEditingName(false);
      setNameSuccess('تم تحديث الاسم بنجاح');
      void fetchAccountData();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setNameError(String(err.response.data.message));
      } else {
        setNameError('تعذر تحديث الاسم. يرجى المحاولة لاحقاً.');
      }
    } finally {
      setSavingName(false);
    }
  };

  // Handle Address Save
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDesc = addressDesc.trim();
    if (!trimmedDesc) {
      setAddressError('وصف العنوان مطلوب');
      return;
    }

    setSavingAddress(true);
    setAddressError(null);
    setAddressSuccess(null);

    try {
      const payload: UpdateCustomerAddressRequest = {
        lat,
        lng,
        description: trimmedDesc,
      };
      await api.put('/customer/me/address', payload);
      setAddressSuccess('تم حفظ العنوان بنجاح');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setAddressError(String(err.response.data.message));
      } else {
        setAddressError('تعذر حفظ العنوان.');
      }
    } finally {
      setSavingAddress(false);
    }
  };

  const markerPosition = useMemo((): [number, number] => [lat, lng], [lat, lng]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>جاري تحميل الملف الشخصي...</p>
      </div>
    );
  }

  return (
    <div className="account-screen">
      <div style={{ marginBottom: '20px' }}>
        <h1 className="page-title">حسابي</h1>
        <p className="page-subtitle">إدارة معلوماتك الشخصية وعنوان التوصيل المعتمد</p>
      </div>

      {/* Profile Overview Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>الحساب الشخصي</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-h)' }}>
              {profile?.name}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right' }}>
              {profile?.whatsapp}
            </div>
          </div>
          <span className="badge badge-delivered" style={{ padding: '6px 12px' }}>
            <span className="badge-dot" />
            {profile?.status === 'VERIFIED' ? 'حساب موثق' : profile?.status}
          </span>
        </div>

        {/* Inline Name Editing */}
        {isEditingName ? (
          <form onSubmit={handleSaveName} style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label className="label">الاسم الكامل</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {nameError && <div className="field-error">{nameError}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setIsEditingName(false);
                  setName(profile?.name || '');
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={savingName}
              >
                {savingName ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setIsEditingName(true)}
          >
            تعديل الاسم
          </button>
        )}

        {nameSuccess && (
          <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
            {nameSuccess}
          </div>
        )}
      </div>

      {/* Customer Statistics Card */}
      <div className="card">
        <h2 className="section-title">إحصائياتي في فَوْراً</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg)',
              borderRadius: 'var(--radius)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
              {profile?.completedOrders ?? 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              طلبات مكتملة
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg)',
              borderRadius: 'var(--radius)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
              {profile?.totalFeesPaid ?? 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              إجمالي الرسوم (ل.س)
            </div>
          </div>
        </div>
      </div>

      {/* Saved Delivery Address Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: '4px' }}>عنوان التوصيل الافتراضي</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              {addressDesc ? `العنوان الحالي: ${addressDesc}` : 'لم يتم تحديد عنوان افتراضي بعد'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowMap((prev) => !prev)}
            style={{ fontWeight: 700, fontSize: '13px' }}
          >
            {showMap ? 'إخفاء الخريطة' : 'تحديد موقعي على الخريطة'}
          </button>
        </div>

        {showMap && (
          <div className="map-container" style={{ height: '200px', marginBottom: '14px' }}>
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
        )}

        <form onSubmit={handleSaveAddress} style={{ marginTop: '14px' }}>
          <div className="form-group">
            <label className="label">وصف العنوان</label>
            <input
              type="text"
              className="input"
              value={addressDesc}
              onChange={(e) => setAddressDesc(e.target.value)}
              placeholder="مثال: دمشق - المالكي - جانب الحديقة..."
              required
            />
          </div>

          {addressError && <div className="field-error">{addressError}</div>}
          {addressSuccess && (
            <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
              {addressSuccess}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={savingAddress}
            style={{ width: '100%' }}
          >
            {savingAddress ? 'جارٍ الحفظ...' : 'احفظ العنوان'}
          </button>
        </form>
      </div>

      {/* Logout Action */}
      <div style={{ marginTop: '24px', marginBottom: '32px' }}>
        <button
          type="button"
          className="btn btn-danger-outline btn-block"
          onClick={() => void logout()}
          style={{ padding: '14px' }}
        >
          تسجيل الخروج من الحساب
        </button>
      </div>
    </div>
  );
}

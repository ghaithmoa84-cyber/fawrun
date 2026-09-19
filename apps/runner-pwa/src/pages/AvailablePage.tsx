import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import type {
  OrderAssignedPayload,
  RunnerProfileResponse,
  RunnerStatusUpdate,
  SoundType,
} from '@fawrun/shared-types';

function playSound(soundType: SoundType): void {
  if (typeof AudioContext === 'undefined') return;
  try {
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.type = 'sine';
    if (soundType === 'new_order') {
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(783.99, ctx.currentTime + 0.25);
    } else if (soundType === 'success') {
      osc1.frequency.setValueAtTime(783.99, ctx.currentTime);
    } else {
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
    }

    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);
  } catch {
    // Silently fail if audio is unavailable
  }
}

export function AvailablePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<RunnerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { on, isConnected } = useWebSocket();

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<RunnerProfileResponse>('/runner/me');
      setProfile(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load profile',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const unsubscribe = on<OrderAssignedPayload>(
      'order:assigned',
      (payload) => {
        playSound(payload.sound ?? 'new_order');
        navigate('/active-order');
      },
    );

    return unsubscribe;
  }, [on, navigate]);

  const handleToggle = async () => {
    if (!profile || toggleLoading) return;

    const newStatus: 'AVAILABLE' | 'UNAVAILABLE' =
      profile.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';

    setToggleLoading(true);
    setError(null);

    try {
      const body: RunnerStatusUpdate = { status: newStatus };
      const response = await api.put<{ status: string }>(
        '/runner/me/status',
        body,
      );
      setProfile((prev: RunnerProfileResponse | null) =>
        prev
          ? { ...prev, status: response.data.status as RunnerProfileResponse['status'] }
          : null,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update status',
      );
    } finally {
      setToggleLoading(false);
    }
  };

  const getToggleLabel = () => {
    if (!profile) return '';
    if (profile.status === 'AVAILABLE') return 'إيقاف التوافر';
    if (profile.status === 'UNAVAILABLE') return 'تفعيل التوافر';
    return 'في مهمة';
  };

  const getToggleDisabled = () => {
    if (!profile) return true;
    if (profile.status === 'ON_MISSION') return true;
    return toggleLoading || !isConnected;
  };

  const getToggleClass = () => {
    if (!profile || profile.status === 'ON_MISSION') {
      return 'btn btn-outline';
    }
    return profile.status === 'AVAILABLE'
      ? 'btn btn-warning'
      : 'btn btn-success';
  };

  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: '24px' }}>
        <p>جارٍ تحميل الملف الشخصي...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container" style={{ paddingTop: '24px' }}>
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2>{profile.name}</h2>
            <p style={{ color: 'var(--text)' }}>{profile.whatsapp}</p>
            {profile.altPhone && (
              <p style={{ color: 'var(--text)' }}>{profile.altPhone}</p>
            )}
            {profile.avgRating !== null && (
              <p style={{ color: 'var(--text)' }}>
                التقييم: {profile.avgRating}⭐ ({profile.totalRatings})
              </p>
            )}
          </div>
          <span
            className={`status-badge ${
              profile.status === 'AVAILABLE'
                ? 'status-available'
                : profile.status === 'ON_MISSION'
                  ? 'status-on-mission'
                  : 'status-unavailable'
            }`}
          >
            {profile.status === 'AVAILABLE'
              ? 'متاح'
              : profile.status === 'ON_MISSION'
                ? 'في مهمة'
                : 'غير متاح'}
          </span>
        </div>

        {profile.status === 'ON_MISSION' && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(147,51,234,0.1)',
              borderRadius: '8px',
            }}
          >
            <p style={{ color: '#7c3aed', fontSize: '14px' }}>
              أنت في مهمة حالية. لا يمكن تغيير الحالة الآن.
            </p>
          </div>
        )}

        {profile.status !== 'ON_MISSION' && (
          <>
            <button
              type="button"
              className={getToggleClass()}
              onClick={handleToggle}
              disabled={getToggleDisabled()}
              style={{ width: '100%', marginTop: '16px' }}
            >
              {toggleLoading ? 'جارٍ التحديث...' : getToggleLabel()}
            </button>

            {!isConnected && (
              <p
                style={{ color: '#f59e0b', fontSize: '13px', marginTop: '8px' }}
              >
                الاتصال غير متوفر - سيتم تجديد الطلبات تلقائيًا
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <div
          className="toast"
          style={{ bottom: 'auto', top: '24px' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

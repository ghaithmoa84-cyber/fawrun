import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import api, { clearAuth, decodeJwtExpiry, setAuthCookie } from '../lib/client';
import type { LoginResponse } from '@fawrun/shared-types';

type AuthUser = LoginResponse['user'];

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: () => boolean;
  isLoading: boolean;
  login: (whatsapp: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUserStatus: (status: AuthUser['status']) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedName = localStorage.getItem('userName');
    const storedRole = localStorage.getItem('userRole') as AuthUser['role'] | null;
    const storedStatus = (localStorage.getItem('userStatus') as AuthUser['status'] | null) ?? 'PENDING_VERIFICATION';
    if (storedUserId && storedName && storedRole) {
      return {
        id: storedUserId,
        name: storedName,
        role: storedRole,
        status: storedStatus,
      };
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
    const hasStatus = typeof window !== 'undefined' && !!localStorage.getItem('userStatus');
    return hasToken && !hasStatus;
  });

  const isAuthenticated = useCallback((): boolean => {
    return !!localStorage.getItem('accessToken') && !!user;
  }, [user]);

  const updateUserStatus = useCallback((status: AuthUser['status']) => {
    localStorage.setItem('userStatus', status);
    setUser((prev) => (prev ? { ...prev, status } : null));
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.get<{ status: AuthUser['status']; name?: string }>('/customer/me');
      if (res.data?.status) {
        updateUserStatus(res.data.status);
        if (res.data.name) {
          localStorage.setItem('userName', res.data.name);
          setUser((prev) => (prev ? { ...prev, name: res.data.name! } : null));
        }
      }
    } catch {
      // 403 Forbidden means still pending verification; 401 handled by client interceptor
    }
  }, [updateUserStatus]);

  // Server as Source of Truth: When accessToken exists without userStatus in localStorage
  // or user is in PENDING_VERIFICATION, fetch /customer/me to sync actual server status.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    const cachedStatus = localStorage.getItem('userStatus');
    if (!cachedStatus || user?.status === 'PENDING_VERIFICATION') {
      refreshProfile().finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [refreshProfile, user?.status]);

  const login = useCallback(async (whatsapp: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        whatsapp,
        password,
      });

      const data = response.data;
      const expiry = decodeJwtExpiry(data.accessToken);

      localStorage.setItem('accessToken', data.accessToken);
      setAuthCookie(data.accessToken);

      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userStatus', data.user.status);
      localStorage.setItem('userWhatsapp', whatsapp);
      if (expiry) {
        localStorage.setItem('tokenExpiry', expiry.toString());
      }

      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore logout request errors, storage is cleared regardless
    } finally {
      clearAuth();
      localStorage.removeItem('userStatus');
      localStorage.removeItem('userWhatsapp');
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, updateUserStatus, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

import {
  createContext,
  useCallback,
  useContext,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedName = localStorage.getItem('userName');
    const storedRole = localStorage.getItem('userRole') as AuthUser['role'] | null;
    const storedStatus = localStorage.getItem('userStatus') as AuthUser['status'] | null;
    if (storedUserId && storedName && storedRole) {
      return {
        id: storedUserId,
        name: storedName,
        role: storedRole,
        status: storedStatus || 'VERIFIED',
      };
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = useCallback((): boolean => {
    return !!localStorage.getItem('accessToken') && !!user;
  }, [user]);

  const updateUserStatus = useCallback((status: AuthUser['status']) => {
    localStorage.setItem('userStatus', status);
    setUser((prev) => (prev ? { ...prev, status } : null));
  }, []);

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
      value={{ user, isAuthenticated, isLoading, login, logout, updateUserStatus }}
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

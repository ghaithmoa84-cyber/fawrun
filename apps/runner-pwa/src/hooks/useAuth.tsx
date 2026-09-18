import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import api from '../api/client';
import type { LoginResponse } from '@fawrun/shared-types';

interface User {
  id: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (whatsapp: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEYS = [
  'accessToken',
  'refreshToken',
  'tokenExpiry',
  'runnerId',
  'userName',
  'userRole',
];

function clearAuth(): void {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

function decodeJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedRunnerId = localStorage.getItem('runnerId');
    const storedName = localStorage.getItem('userName');
    const storedRole = localStorage.getItem('userRole');
    if (storedRunnerId && storedName && storedRole) {
      return { id: storedRunnerId, name: storedName, role: storedRole };
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (whatsapp: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        whatsapp,
        password,
      });

      const data = response.data;
      const expiry = decodeJwtExpiry(data.accessToken);

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('runnerId', data.user.id);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userRole', data.user.role);
      if (expiry) {
        localStorage.setItem('tokenExpiry', expiry.toString());
      }

      setUser({
        id: data.user.id,
        name: data.user.name,
        role: data.user.role,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: user !== null, isLoading, login, logout }}
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

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import api, { clearAuth, decodeJwtExpiry, setAuthCookie } from '../api/client';
import type { LoginResponse } from '@fawrun/shared-types';

type AuthUser = LoginResponse['user'];

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (whatsapp: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedRunnerId = localStorage.getItem('runnerId');
    const storedName = localStorage.getItem('userName');
    const storedRole = localStorage.getItem('userRole') as AuthUser['role'] | null;
    if (storedRunnerId && storedName && storedRole) {
      return {
        id: storedRunnerId,
        name: storedName,
        role: storedRole,
        status: 'VERIFIED',
      };
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
      setAuthCookie(data.accessToken);

      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('runnerId', data.user.id);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userRole', data.user.role);
      if (expiry) {
        localStorage.setItem('tokenExpiry', expiry.toString());
      }

      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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

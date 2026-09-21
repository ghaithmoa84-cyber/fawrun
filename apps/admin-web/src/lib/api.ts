import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from 'axios';
import type { LoginResponse } from '@fawrun/shared-types';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
});

const REFRESH_THRESHOLD_MS = 10 * 60 * 1000;
const LOGIN_PATH = '/login';

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(key);
  if (val) return val;

  if (key === 'accessToken' && typeof document !== 'undefined') {
    const match = document.cookie.match(/(^|;\s*)accessToken=([^;]*)/);
    if (match && match[2]) {
      const cookieToken = decodeURIComponent(match[2]);
      const cookieExpiry = parseInt(
        document.cookie.match(/(^|;\s*)tokenExpiry=([^;]+)/)?.[2] ?? '0',
        10,
      );
      const expiry = cookieExpiry || decodeJwtExpiry(cookieToken);

      if (expiry && Date.now() < expiry && cookieToken.length > 20) {
        localStorage.setItem('accessToken', cookieToken);
        localStorage.setItem('tokenExpiry', expiry.toString());
        return cookieToken;
      } else {
        clearAuth();
        return null;
      }
    }
  }

  if (key === 'tokenExpiry' && typeof document !== 'undefined') {
    const cookieExpiry = document.cookie.match(/(^|;\s*)tokenExpiry=([^;]+)/)?.[2];
    if (cookieExpiry) {
      const expiry = parseInt(cookieExpiry, 10);
      if (expiry && Date.now() < expiry) {
        localStorage.setItem('tokenExpiry', cookieExpiry);
        return cookieExpiry;
      }
    }
  }

  return null;
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

const AUTH_KEYS = ['accessToken', 'refreshToken', 'tokenExpiry', 'userId', 'userName', 'userRole'];

function clearAuth(): void {
  AUTH_KEYS.forEach(removeStorage);
  if (typeof document !== 'undefined') {
    const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
    document.cookie = `accessToken=; path=/; max-age=0; SameSite=Lax;${secure}`;
    document.cookie = `tokenExpiry=; path=/; max-age=0; SameSite=Lax;${secure}`;
  }
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

function isTokenExpiringSoon(): boolean {
  const expiryStr = readStorage('tokenExpiry');
  if (!expiryStr) return false;
  const expiry = parseInt(expiryStr, 10);
  if (Number.isNaN(expiry)) return false;
  return Date.now() + REFRESH_THRESHOLD_MS > expiry;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readStorage('refreshToken');
  if (!refreshToken) {
    clearAuth();
    redirectToLogin();
    return null;
  }

  try {
    const response = await axios.post<LoginResponse>(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/auth/refresh`,
      { refreshToken },
    );

    const { accessToken, refreshToken: newRefreshToken, user } = response.data;
    const newExpiry = decodeJwtExpiry(accessToken);

    writeStorage('accessToken', accessToken);
    if (typeof document !== 'undefined') {
      const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
      const maxAge = 7 * 24 * 60 * 60;
      document.cookie = `accessToken=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax;${secure}`;
      if (newExpiry) {
        document.cookie = `tokenExpiry=${newExpiry}; path=/; max-age=${maxAge}; SameSite=Lax;${secure}`;
      }
    }
    writeStorage('refreshToken', newRefreshToken);
    writeStorage('userName', user.name);
    writeStorage('userRole', user.role);
    if (newExpiry) {
      writeStorage('tokenExpiry', newExpiry.toString());
    }

    return accessToken;
  } catch {
    clearAuth();
    redirectToLogin();
    return null;
  }
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    if (!window.location.pathname.startsWith(LOGIN_PATH)) {
      window.location.href = `${LOGIN_PATH}?expired=true`;
    }
  }
}

let isRefreshing = false;
let pendingRefresh: Promise<string | null> | null = null;

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = readStorage('accessToken');

    if (accessToken && isTokenExpiringSoon()) {
      if (!isRefreshing) {
        isRefreshing = true;
        pendingRefresh = refreshAccessToken().finally(() => {
          isRefreshing = false;
          pendingRefresh = null;
        });
      }

      if (pendingRefresh) {
        await pendingRefresh;
      }
    }

    const token = readStorage('accessToken');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        if (token) {
          originalRequest.headers.set('Authorization', `Bearer ${token}`);
          return api(originalRequest);
        }
      } catch {
        clearAuth();
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  },
);

export default api;
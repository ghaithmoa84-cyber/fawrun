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
  return localStorage.getItem(key);
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
    writeStorage('refreshToken', newRefreshToken);
    writeStorage('userId', user.id);
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
    window.location.href = LOGIN_PATH;
  }
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  const normalized = url.includes('?') ? url.split('?')[0]! : url;
  return (
    normalized === '/auth/login' ||
    normalized === '/auth/refresh' ||
    normalized === '/auth/logout'
  );
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
    if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      try {
        await refreshAccessToken();
        if (error.config) {
          return api(error.config);
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
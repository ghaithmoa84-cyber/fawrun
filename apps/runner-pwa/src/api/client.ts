import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import type { LoginResponse } from '@fawrun/shared-types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
});

const REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const LOGIN_PATH = '/login';

function readStorage(key: string): string | null {
  return localStorage.getItem(key);
}

function writeStorage(key: string, value: string): void {
  localStorage.setItem(key, value);
}

function removeStorage(key: string): void {
  localStorage.removeItem(key);
}

const AUTH_KEYS = [
  'accessToken',
  'refreshToken',
  'tokenExpiry',
  'runnerId',
  'userName',
  'userRole',
];

export function setAuthCookie(token: string): void {
  if (typeof document !== 'undefined') {
    const secure = import.meta.env.PROD ? ' Secure;' : '';
    document.cookie = `accessToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax;${secure}`;
  }
}

export function clearAuthCookie(): void {
  if (typeof document !== 'undefined') {
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
  }
}

export function clearAuth(): void {
  AUTH_KEYS.forEach(removeStorage);
  clearAuthCookie();
}

export function decodeJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpiringSoon(): boolean {
  const expiryStr = readStorage('tokenExpiry');
  if (!expiryStr) return false;
  const expiry = parseInt(expiryStr, 10);
  if (Number.isNaN(expiry)) return false;
  return Date.now() + REFRESH_THRESHOLD_MS > expiry;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readStorage('refreshToken');
  if (!refreshToken) {
    clearAuth();
    redirectToLogin();
    return null;
  }

  try {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const response = await axios.post<LoginResponse>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
    );

    const { accessToken, refreshToken: newRefreshToken, user } = response.data;
    const newExpiry = decodeJwtExpiry(accessToken);

    writeStorage('accessToken', accessToken);
    setAuthCookie(accessToken);

    writeStorage('refreshToken', newRefreshToken);
    writeStorage('runnerId', user.id);
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
  if (typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
    window.location.href = LOGIN_PATH;
  }
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  const normalized = url.includes('?') ? url.split('?')[0]! : url;
  return (
    normalized.endsWith('/auth/login') ||
    normalized.endsWith('/auth/refresh') ||
    normalized.endsWith('/auth/logout')
  );
}

let isRefreshing = false;
let pendingRefresh: Promise<string | null> | null = null;

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = readStorage('accessToken');

    if (accessToken && !isAuthEndpoint(config.url) && isTokenExpiringSoon()) {
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
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
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

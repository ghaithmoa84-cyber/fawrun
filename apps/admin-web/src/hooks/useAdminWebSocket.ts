'use client';

import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface UseAdminWebSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  on: <T = unknown>(event: string, handler: (payload: T) => void) => () => void;
}

type ListenerMap = Map<string, Set<(payload: unknown) => void>>;

let singletonSocket: Socket | null = null;
let isConnectedState = false;
let wsUrl: string | null = null;
const listeners: ListenerMap = new Map();

function getWsUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
}

function createSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const url = getWsUrl();
  if (!url) return null;

  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const socket = io(`${url}/admin`, {
    auth: (cb) => cb({ token: localStorage.getItem('accessToken') ?? '' }),
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    isConnectedState = true;
    window.dispatchEvent(new Event('fawrun:ws:connect'));
    flushListeners();
  });

  socket.on('disconnect', () => {
    isConnectedState = false;
    window.dispatchEvent(new Event('fawrun:ws:disconnect'));
  });

  socket.on('connect_error', (err) => {
    console.error('[WS] connect_error:', err.message);
  });

  return socket;
}

function flushListeners(): void {
  if (!singletonSocket) return;
  listeners.forEach((handlers, event) => {
    handlers.forEach((handler) => {
      singletonSocket!.on(event, handler as Parameters<Socket['on']>[1]);
    });
  });
}

function setupSingleton(): void {
  if (singletonSocket) return;
  wsUrl = getWsUrl();
  if (!wsUrl) return;

  singletonSocket = createSocket();
  if (!singletonSocket) return;

  if (typeof window !== 'undefined') {
    (window as unknown as { socket: Socket }).socket = singletonSocket;
  }

  singletonSocket.on('connect', () => {
    isConnectedState = true;
  });

  singletonSocket.on('disconnect', () => {
    isConnectedState = false;
  });
}

export function useAdminWebSocket(): UseAdminWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    setupSingleton();
    setSocket(singletonSocket);

    const update = () => setIsConnected(isConnectedState);
    update();

    window.addEventListener('fawrun:ws:connect', update);
    window.addEventListener('fawrun:ws:disconnect', update);

    return () => {
      window.removeEventListener('fawrun:ws:connect', update);
      window.removeEventListener('fawrun:ws:disconnect', update);
    };
  }, []);

  const on = useCallback(
    <T = unknown>(event: string, handler: (payload: T) => void) => {
      if (!singletonSocket) {
        return () => {};
      }

      const wrapped = (payload: T) => handler(payload);

      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(wrapped as (payload: unknown) => void);

      if (isConnectedState) {
        singletonSocket.on(event, wrapped as Parameters<Socket['on']>[1]);
      }

      return () => {
        const set = listeners.get(event);
        if (set) {
          set.delete(wrapped as (payload: unknown) => void);
          if (set.size === 0) {
            listeners.delete(event);
          }
        }
        if (isConnectedState && singletonSocket) {
          singletonSocket.off(event, wrapped as Parameters<Socket['on']>[1]);
        }
      };
    },
    [],
  );

  return { socket, isConnected, on };
}

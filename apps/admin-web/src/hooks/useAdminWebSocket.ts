'use client';

import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface UseAdminWebSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  on: <T = unknown>(event: string, handler: (payload: T) => void) => () => void;
}

export function useAdminWebSocket(): UseAdminWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }

    const newSocket = io(`${wsUrl}/admin`, {
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') ?? '' }),
      transports: ['websocket'],
    });

    setSocket(newSocket);
    if (typeof window !== 'undefined') {
      (window as unknown as { socket: Socket }).socket = newSocket;
    }

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[WS] connect_error:', err.message);
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
      if (typeof window !== 'undefined') {
        delete (window as unknown as { socket?: Socket }).socket;
      }
    };
  }, [wsUrl]);

  const on = useCallback(
    <T = unknown>(event: string, handler: (payload: T) => void) => {
      if (!socket) {
        return () => {};
      }
      const wrapped = (payload: T) => handler(payload);
      socket.on(event, wrapped);
      return () => {
        socket.off(event, wrapped);
      };
    },
    [socket],
  );

  return { socket, isConnected, on };
}
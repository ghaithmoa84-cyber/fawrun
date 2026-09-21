import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface UseWebSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  on: <T = unknown>(event: string, handler: (payload: T) => void) => () => void;
}

export function useWebSocket(): UseWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    const accessToken = localStorage.getItem('accessToken');
    const runnerId = localStorage.getItem('runnerId');

    if (!accessToken || !runnerId) {
      return;
    }

    const newSocket = io(`${wsUrl}/orders`, {
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') ?? '' }),
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Runner WS] connect_error:', err.message);
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

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

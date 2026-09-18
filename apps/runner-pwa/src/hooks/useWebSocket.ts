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
    const accessToken = localStorage.getItem('accessToken');
    const runnerId = localStorage.getItem('runnerId');

    if (!accessToken || !runnerId) {
      return;
    }

    const newSocket = io(`${import.meta.env.VITE_WS_URL}/orders`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-room', `runner:${runnerId}`);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
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

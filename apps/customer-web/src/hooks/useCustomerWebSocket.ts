import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CLIENT_EVENTS } from '@fawrun/shared-types';
import { useAuth } from './useAuth';

import { playNotificationBeep } from '../lib/sound';

interface UseCustomerWebSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  on: <T = unknown>(event: string, handler: (payload: T) => void) => () => void;
}

export function useCustomerWebSocket(): UseCustomerWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    const accessToken = localStorage.getItem('accessToken');
    const currentUserId = user?.id || localStorage.getItem('userId');

    // Condition: Allow connection for any logged-in user with accessToken and userId,
    // regardless of account status (explicitly allows PENDING_VERIFICATION and VERIFIED)
    if (!accessToken || !currentUserId) {
      return;
    }

    const newSocket = io(`${wsUrl}/orders`, {
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') ?? '' }),
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Explicitly emit join to room customer:{customerId} in addition to server auto-join
      newSocket.emit('join', { room: `customer:${currentUserId}` });
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
    };
  }, [user?.id]);

  const on = useCallback(
    <T = unknown>(event: string, handler: (payload: T) => void) => {
      if (!socket) {
        return () => {};
      }
      const wrapped = (payload: T) => {
        playNotificationBeep();
        handler(payload);
      };
      socket.on(event, wrapped);
      return () => {
        socket.off(event, wrapped);
      };
    },
    [socket],
  );

  return { socket, isConnected, on };
}

export { CLIENT_EVENTS };

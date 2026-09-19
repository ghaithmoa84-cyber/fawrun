'use client';

import { useEffect } from 'react';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import { useToast } from '@/components/Toast';
import { ADMIN_EVENTS, type SettlementReminderPayload } from '@fawrun/shared-types';

export function AdminWebSocketListener() {
  const { on, isConnected } = useAdminWebSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isConnected) return;

    const cleanup = on<SettlementReminderPayload>(ADMIN_EVENTS.SETTLEMENT_REMINDER, (data) => {
      showToast(`لديك ${data.pendingRunnerCount} مندوب بتسوية معلقة (${data.date})`, 'urgent');
    });

    return cleanup;
  }, [isConnected, on, showToast]);

  return null;
}
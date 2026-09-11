export const CLIENT_EVENTS = {
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_RUNNER_ASSIGNED: 'order:runner_assigned',
  ORDER_FEE_UPDATED: 'order:fee_updated',
  ORDER_STORE_PURCHASED: 'order:store_purchased',
  ORDER_OUT_FOR_DELIVERY: 'order:out_for_delivery',
  ORDER_DELIVERED: 'order:delivered',
  ORDER_CANCELLED: 'order:cancelled',
  ACCOUNT_VERIFIED: 'account:verified',
} as const;

export const RUNNER_EVENTS = {
  ORDER_ASSIGNED: 'order:assigned',
  ORDER_REASSIGNED: 'order:reassigned',
  ORDER_ASSIGNMENT_CANCELLED: 'order:assignment_cancelled',
} as const;

export const ADMIN_EVENTS = {
  ORDER_NEW: 'order:new',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_NEEDS_ATTENTION: 'order:needs_attention',
  USER_NEW_REGISTRATION: 'user:new_registration',
  SETTLEMENT_REMINDER: 'settlement:reminder',
} as const;

export type OrderStatusChangedPayload = {
  orderId: string;
  orderNumber: string;
  newStatus: string;
  oldStatus: string;
};

export type OrderRunnerAssignedPayload = {
  orderId: string;
  runnerName: string;
};

export type OrderFeeUpdatedPayload = {
  orderId: string;
  oldFee: number;
  newFee: number;
  reason: string;
};

export type OrderStorePurchasedPayload = {
  orderId: string;
  storeName: string;
};

export type OrderOutForDeliveryPayload = {
  orderId: string;
};

export type OrderDeliveredPayload = {
  orderId: string;
  deliveredAt: string;
};

export type OrderCancelledPayload = {
  orderId: string;
  reason: string;
  cancelledBy: string;
};

export type AccountVerifiedPayload = {
  message: string;
};

export type OrderAssignedPayload = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: {
    lat: number;
    lng: number;
    description: string;
  };
  items: Array<{
    itemName: string;
    quantity: string;
    customStoreName: string | null;
    anyStore: boolean;
  }>;
  estimatedFee: {
    baseFee: number;
    peripheralFee: number;
    extraStoresFee: number;
    totalFee: number;
    note: string;
  };
};

export type OrderReassignedPayload = {
  orderId: string;
};

export type OrderAssignmentCancelledPayload = {
  orderId: string;
  reason: string;
};

export type OrderNewPayload = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
};

export type OrderNeedsAttentionPayload = {
  orderId: string;
  reason: string;
};

export type UserNewRegistrationPayload = {
  userId: string;
  userName: string;
  whatsapp: string;
};

export type SettlementReminderPayload = {
  date: string;
  pendingRunnerCount: number;
};

export type SoundType = 'new_order' | 'status_update' | 'urgent' | 'success';

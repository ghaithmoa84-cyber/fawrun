export const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'UNDER_REVIEW',
  'AWAITING_RUNNER',
  'AWAITING_PREFERRED_RUNNER',
  'ASSIGNED',
  'IN_PROGRESS',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

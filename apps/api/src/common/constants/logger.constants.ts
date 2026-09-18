export const LOG_CONTEXTS = {
  CUSTOMER_ORDERS: 'CustomerOrdersService',
  ADMIN_ORDER_QUERY: 'AdminOrderQueryService',
  ADMIN_ORDER_COMMAND: 'AdminOrderCommandService',
  RUNNER_ORDERS: 'RunnerOrdersService',
  AUTH: 'AuthService',
  NOTIFICATIONS: 'NotificationsService',
  WEBSOCKET: 'WebSocketGateway',
  PRICING: 'PricingService',
  LEDGER: 'LedgerService',
  AUDIT: 'AuditService',
} as const;

export type LogContext = (typeof LOG_CONTEXTS)[keyof typeof LOG_CONTEXTS];
import * as Sentry from '@sentry/nestjs';
import { nestIntegration } from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [nestIntegration()],
    tracesSampleRate: 1.0,
  });
}
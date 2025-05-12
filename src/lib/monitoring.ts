import * as Sentry from '@sentry/react';
import { datadogRum } from '@datadog/browser-rum';
import { reportWebVitals } from 'web-vitals';

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});

// Initialize Datadog RUM
datadogRum.init({
  applicationId: import.meta.env.VITE_DATADOG_APP_ID,
  clientToken: import.meta.env.VITE_DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.com',
  service: 'music-platform',
  env: import.meta.env.MODE,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
});

// Report Web Vitals
reportWebVitals(({ name, value, id }) => {
  // Send to Datadog
  datadogRum.addTiming(name, value);
  
  // Send to Sentry
  Sentry.captureMessage('Web Vitals', {
    level: 'info',
    extra: { metric: name, value, id },
  });
});

// Custom error boundary
export class ErrorBoundary extends Sentry.ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Send to Datadog
    datadogRum.addError(error, { errorInfo });
    
    // Send to Sentry
    Sentry.captureException(error, { extra: errorInfo });
  }
}

// Performance monitoring
export const trackPerformance = (name: string, fn: () => Promise<any>) => {
  const start = performance.now();
  
  return fn().finally(() => {
    const duration = performance.now() - start;
    
    // Send to Datadog
    datadogRum.addTiming(name, duration);
    
    // Send to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name} took ${duration}ms`,
      level: 'info',
    });
  });
};

// User tracking
export const trackUser = (userId: string, traits: Record<string, any>) => {
  // Set user in Sentry
  Sentry.setUser({
    id: userId,
    ...traits,
  });
  
  // Set user in Datadog
  datadogRum.setUser({
    id: userId,
    ...traits,
  });
};

// Feature flags
export const getFeatureFlag = (name: string): boolean => {
  try {
    return import.meta.env[`VITE_FEATURE_${name.toUpperCase()}`] === 'true';
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
};
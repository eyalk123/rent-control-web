import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * App-level error boundary. Catches render errors anywhere in the tree (including
 * outside the router, e.g. providers or a crashing modal) so a single failure
 * does not blank the whole app. Route-level errors are still handled by
 * RouteErrorPage; this is the outer safety net. Errors are forwarded to Sentry.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    if (import.meta.env.DEV) console.error('[AppErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          background: 'var(--color-background, #f1f5f9)',
          color: 'var(--color-text-primary, #0f172a)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: 14, opacity: 0.75, maxWidth: 360, margin: 0 }}>
          The app ran into an unexpected error. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          style={{
            marginTop: 8,
            height: 40,
            padding: '0 20px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--color-primary, #2563EB)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}

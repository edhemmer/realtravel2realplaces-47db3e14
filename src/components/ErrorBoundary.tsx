/**
 * v3.9.10: Global + Trip-level Error Boundary
 * 
 * Catches runtime render errors and prevents white screens.
 * Provides "Reload" and "Back to Dashboard" actions.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional context label for logging */
  context?: string;
  /** Optional custom fallback renderer */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Dev-only logging (no PII)
    console.error(
      `[ErrorBoundary${this.props.context ? `:${this.props.context}` : ''}] Render error caught:`,
      error.message,
      errorInfo.componentStack?.slice(0, 500)
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleReset);
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            We couldn't load this page. This is usually temporary — try reloading.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { window.location.href = '/dashboard'; }}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Button>
            <Button
              size="sm"
              onClick={() => { window.location.reload(); }}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Reload
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-6 text-xs text-left text-muted-foreground bg-muted p-3 rounded max-w-lg overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

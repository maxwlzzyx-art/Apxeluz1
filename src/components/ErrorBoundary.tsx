import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
      this.setState({ hasError: false, error: null });
    } else {
      window.location.reload();
    }
  };

  public handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl liquid-glass text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fee2e2] border border-white flex items-center justify-center text-[#be123c] shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="heading-font text-xl font-bold text-[#0f2c38] text-3d-subtle">
              {this.props.fallbackTitle || 'Interface Render Error'}
            </h2>
            <p className="text-xs sm:text-sm text-[#355968] leading-relaxed">
              An unexpected error occurred while rendering this section. Your database and account are safe.
            </p>
            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-white/80 border border-white text-left overflow-x-auto text-[11px] font-mono text-[#be123c]">
                {this.state.error.message}
              </div>
            )}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={this.handleReload}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl liquid-glass-button text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Interface</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl liquid-glass-button-secondary text-[#0f2c38] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-[#0d9488]" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

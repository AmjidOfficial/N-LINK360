import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[N-LINK 360 ErrorBoundary] Caught runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('nlink_active_logged_user');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B1120] text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h1 className="text-lg font-black tracking-wide text-white uppercase">
                {this.props.fallbackTitle || 'Application Notice'}
              </h1>
              <p className="text-xs text-slate-300">
                A temporary display issue occurred while rendering this view. The data is safe and secured.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-[#0F172A] p-3 rounded-xl border border-slate-700/80 text-[11px] font-mono text-amber-300 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary w-full min-h-[44px] py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Reset View &amp; Return to Login</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>National Lights • N-LINK 360 Self-Healing Engine</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

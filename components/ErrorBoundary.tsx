
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  componentName?: string;
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
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
      this.setState({ hasError: false, error: null });
      if (this.props.onReset) this.props.onReset();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 rounded-3xl p-8 text-center border-2 border-red-900/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            <div className="z-10 bg-slate-950 p-6 rounded-2xl shadow-2xl border border-slate-800 max-w-md">
                <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2 font-display tracking-wider">SYSTEM MALFUNCTION</h2>
                <p className="text-slate-400 text-sm mb-6">
                    The {this.props.componentName || 'Game'} module encountered an unexpected error. Your balance is safe.
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
                    >
                        Reload App
                    </button>
                    <button 
                        onClick={this.handleReset}
                        className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/20 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

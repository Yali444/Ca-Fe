"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// Key used for sessionStorage and window — paste this in DevTools console
// to retrieve the last error:
//   JSON.parse(sessionStorage.getItem('__cafe_last_error') || '{}')
//   copy(__cafe_last_error)   // copies the full object to clipboard
const ERROR_STORAGE_KEY = "__cafe_last_error";

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const payload = {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      componentStack: errorInfo.componentStack ?? null,
      ts: new Date().toISOString(),
    };

    // Full details stay in DevTools — never in the DOM
    console.error("[ErrorBoundary]", payload);

    // Also available via:
    //   sessionStorage.getItem('__cafe_last_error')   (Application tab)
    //   copy(__cafe_last_error)                       (Console tab)
    try {
      sessionStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(payload, null, 2));
      // @ts-expect-error intentional global for quick DevTools access
      window[ERROR_STORAGE_KEY] = payload;
    } catch {
      // sessionStorage blocked (private mode etc.) — console.error is enough
    }

    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-dvh w-screen items-center justify-center bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-none dark:bg-[#0B1120] p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-[#0C4A6E] dark:text-slate-200 mb-4">
              שגיאה בטעינת האפליקציה
            </h1>
            <p className="text-[#64748B] dark:text-slate-400 mb-6">
              אנא נסה לרענן את הדף
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#0284C7] px-6 py-3 text-white hover:bg-[#0369A1] transition-colors"
            >
              רענן דף
            </button>
            {/* Error details are in DevTools — open Console or run: */}
            {/* copy(__cafe_last_error)                               */}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

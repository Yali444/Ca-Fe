"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120] p-8">
            <div className="text-center">
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
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}










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
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private fullErrorText(): string {
    const { error, errorInfo } = this.state;
    const lines: string[] = [];
    if (error) {
      lines.push(`${error.name}: ${error.message}`);
      if (error.stack) lines.push("\n--- stack ---\n" + error.stack);
    }
    if (errorInfo?.componentStack) {
      lines.push("\n--- component stack ---\n" + errorInfo.componentStack);
    }
    return lines.join("\n");
  }

  private handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this.fullErrorText());
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, errorInfo, copied } = this.state;
      const fullText = this.fullErrorText();

      return (
        <div className="flex min-h-screen w-screen items-start justify-center bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120] p-8 overflow-auto">
          <div className="w-full max-w-2xl mt-16">
            <h1 className="text-2xl font-bold text-[#0C4A6E] dark:text-slate-200 mb-2 text-center">
              שגיאה בטעינת האפליקציה
            </h1>
            <p className="text-[#64748B] dark:text-slate-400 mb-6 text-center">
              אנא נסה לרענן את הדף, או העתק את הפרטים לדיווח על הבעיה
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
                {/* Header bar with copy button */}
                <div className="flex items-center justify-between bg-red-100 dark:bg-red-900/40 px-3 py-2">
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300 font-mono">
                    {error.name}: {error.message}
                  </span>
                  <button
                    onClick={this.handleCopy}
                    className="text-xs px-2 py-1 rounded bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 hover:bg-red-300 dark:hover:bg-red-700 transition-colors shrink-0 ml-2"
                  >
                    {copied ? "✓ הועתק" : "העתק"}
                  </button>
                </div>

                {/* Stack trace */}
                {error.stack && (
                  <pre className="text-left text-xs bg-red-50 dark:bg-red-900/20 px-3 py-2 overflow-auto max-h-48 text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                    {error.stack}
                  </pre>
                )}

                {/* Component stack */}
                {errorInfo?.componentStack && (
                  <>
                    <div className="bg-red-100 dark:bg-red-900/40 px-3 py-1">
                      <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                        Component stack
                      </span>
                    </div>
                    <pre className="text-left text-xs bg-red-50 dark:bg-red-900/20 px-3 py-2 overflow-auto max-h-48 text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* Hidden textarea for fallback copy */}
            <textarea
              readOnly
              value={fullText}
              className="sr-only"
              aria-label="error details"
            />

            <div className="flex justify-center">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[#0284C7] px-6 py-3 text-white hover:bg-[#0369A1] transition-colors"
              >
                רענן דף
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

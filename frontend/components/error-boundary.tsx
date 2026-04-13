"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import Link from "next/link";

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
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-950">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Algo salió mal
            </h1>
            
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Ocurrió un error inesperado. No te preocupes, tus datos están seguros.
            </p>

            {this.state.error && (
              <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Detalles técnicos
                </summary>
                <pre className="mt-2 overflow-x-auto text-[11px] text-slate-600 dark:text-slate-300">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                <RefreshCcw className="h-4 w-4" />
                Reintentar
              </button>

              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Home className="h-4 w-4" />
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

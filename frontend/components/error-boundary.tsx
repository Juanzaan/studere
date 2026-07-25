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
        <div className="flex min-h-screen items-center justify-center bg-c-bg p-4">
          <div className="w-full max-w-md rounded-panel border border-c-border bg-c-surface p-8 text-center shadow-card">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-c-red-soft">
              <AlertTriangle className="h-8 w-8 text-c-red" />
            </div>

            <h1 className="mt-6 text-2xl font-bold text-c-text">
              Algo salió mal
            </h1>

            <p className="mt-3 text-sm leading-6 text-c-muted">
              Ocurrió un error inesperado. No te preocupes, tus datos están seguros.
            </p>

            {this.state.error && (
              <details className="mt-4 rounded-card border border-c-border bg-c-surface-2 p-4 text-left">
                <summary className="cursor-pointer text-xs font-semibold text-c-muted">
                  Detalles técnicos
                </summary>
                <pre className="mt-2 overflow-x-auto text-[11px] text-c-text">
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
                className="flex items-center justify-center gap-2 rounded-btn bg-c-blue px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none"
              >
                <RefreshCcw className="h-4 w-4" />
                Reintentar
              </button>

              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 rounded-btn border border-c-border bg-c-surface px-6 py-3 text-sm font-semibold text-c-text transition hover:bg-c-surface-2 focus-visible:outline-none"
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

interface PanelProps {
  children: ReactNode;
  panelName: string;
}

interface PanelState {
  hasError: boolean;
  error?: Error;
}

export class PanelErrorBoundary extends Component<PanelProps, PanelState> {
  state: PanelState = { hasError: false };

  static getDerivedStateFromError(error: Error): PanelState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.panelName}] Panel error:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-c-red-border bg-c-red-soft p-8 text-center">
          <p className="text-sm text-c-red">
            {this.props.panelName} encontró un error inesperado.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-c-red underline hover:opacity-80 focus-visible:outline-none"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

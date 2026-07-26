"use client";

import { useToast } from "@/hooks/use-toast";
import { Toast, ToastContainer } from "@/components/toast";
import { createContext, useContext, ReactNode } from "react";

/**
 * Toast notification context and provider.
 *
 * Wraps the app and provides `success`, `error`, `info`, `warning` functions
 * via {@link useToastContext}. Renders active toasts in a {@link ToastContainer}.
 */

/** Shape of the toast context exposed via {@link useToastContext}. */
interface ToastContextType {
  /** Show a success toast (green/teal) */
  success: (title: string, message?: string, duration?: number) => void;
  /** Show an error toast (red) */
  error: (title: string, message?: string, duration?: number) => void;
  /** Show an info toast (blue) */
  info: (title: string, message?: string, duration?: number) => void;
  /** Show a warning toast (amber) */
  warning: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Hook to access toast notifications from any component.
 * Throws if used outside {@link ToastProvider}.
 */
export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within ToastProvider");
  }
  return context;
}

/**
 * Toast notification provider.
 * Wraps children and renders a toast stack overlay.
 *
 * @example
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * ```
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, removeToast, success, error, info, warning } = useToast();

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

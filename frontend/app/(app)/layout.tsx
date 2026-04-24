"use client";

import type { ReactNode } from "react";
import { AppTopbar } from "@/components/app-topbar";
import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { SkipLinks } from "@/components/skip-links";
import { ToastProvider } from "@/components/toast-provider";
import { FocusProvider, useFocus } from "@/lib/focus-context";

function AppLayoutInner({ children }: { children: ReactNode }) {
  const { isFocused } = useFocus();
  return (
    <div className="flex min-h-screen bg-c-bg">
      {!isFocused && <Sidebar />}
      <div className="min-w-0 flex-1">
        {!isFocused && <AppTopbar />}
        <main id="main-content" className={`min-w-0 animate-fade-in px-4 pb-4 ${isFocused ? "" : "pt-3"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <FocusProvider>
          <SkipLinks />
          <AppLayoutInner>{children}</AppLayoutInner>
        </FocusProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

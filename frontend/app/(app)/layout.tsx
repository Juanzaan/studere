"use client";

import type { ReactNode } from "react";
import { AppTopbar } from "@/components/app-topbar";
import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { SkipLinks } from "@/components/skip-links";
import { ToastProvider } from "@/components/toast-provider";
import { FocusProvider, useFocus } from "@/lib/focus-context";

function NormalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-c-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        <AppTopbar />
        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto bg-c-bg animate-fade-in px-4 pb-4 pt-3">
          {children}
        </main>
      </div>
    </div>
  );
}

function FocusedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-c-bg">
      <main className="flex-1 overflow-y-auto bg-c-bg">
        {children}
      </main>
    </div>
  );
}

function AppLayoutInner({ children }: { children: ReactNode }) {
  const { isFocused } = useFocus();
  if (isFocused) {
    return <FocusedLayout>{children}</FocusedLayout>;
  }
  return <NormalLayout>{children}</NormalLayout>;
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

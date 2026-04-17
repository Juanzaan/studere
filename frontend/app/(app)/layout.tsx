import type { ReactNode } from "react";
import { AppTopbar } from "@/components/app-topbar";
import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { SkipLinks } from "@/components/skip-links";
import { ToastProvider } from "@/components/toast-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SkipLinks />
        <div className="flex min-h-screen bg-transparent">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <AppTopbar />
            <main id="main-content" className="min-w-0 animate-fade-in px-3 pb-3 pt-3 sm:px-4 lg:px-5">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

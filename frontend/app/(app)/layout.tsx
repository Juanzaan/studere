"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { AppTopbar } from "@/components/app-topbar";
import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { SkipLinks } from "@/components/skip-links";
import { ToastProvider } from "@/components/toast-provider";
import { FocusProvider, useFocus } from "@/lib/focus-context";
import TutorialContext, { useTutorialContext } from "@/lib/tutorial-context";
import {
  TutorialOverlay,
  DEFAULT_TUTORIAL_STEPS,
  isTutorialCompleted,
} from "@/components/tutorial-overlay";

// ─── Layout variants ──────────────────────────────────────────────────────

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
  const [showTutorial, setShowTutorial] = useState(false);

  // Show tutorial on first visit
  useEffect(() => {
    if (!isTutorialCompleted()) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const restartTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
  }, []);

  return (
    <TutorialContext.Provider value={{ restartTutorial }}>
      {isFocused ? (
        <FocusedLayout>{children}</FocusedLayout>
      ) : (
        <NormalLayout>{children}</NormalLayout>
      )}

      {showTutorial && (
        <TutorialOverlay
          steps={DEFAULT_TUTORIAL_STEPS}
          onComplete={handleTutorialComplete}
        />
      )}
    </TutorialContext.Provider>
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

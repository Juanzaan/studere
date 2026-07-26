"use client";

/**
 * Focus mode context — manages full-screen focus state for session study.
 *
 * When focus mode is active, the Pomodoro timer bar is shown and the session
 * header/sidebar collapse to minimize distractions.
 *
 * Exits focus mode on:
 * - Escape key press
 * - Navigation away from the session page
 *
 * @example
 * ```tsx
 * const { isFocused, enterFocus, exitFocus } = useFocus();
 * if (isFocused) return <PomodoroTimer onExit={exitFocus} />;
 * ```
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface FocusContextValue {
  isFocused: boolean;
  enterFocus: () => void;
  exitFocus: () => void;
}

const FocusContext = createContext<FocusContextValue>({
  isFocused: false,
  enterFocus: () => {},
  exitFocus: () => {},
});

/**
 * Focus mode context provider.
 * Wraps the session detail view to enable/disable focus mode.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const [isFocused, setIsFocused] = useState(false);

  const enterFocus = useCallback(() => setIsFocused(true), []);
  const exitFocus = useCallback(() => setIsFocused(false), []);

  // Exit focus on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocused) setIsFocused(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFocused]);

  // Exit focus when navigating away from session page
  const pathname = usePathname();
  useEffect(() => {
    exitFocus();
  }, [pathname, exitFocus]);

  return (
    <FocusContext.Provider value={{ isFocused, enterFocus, exitFocus }}>
      {children}
    </FocusContext.Provider>
  );
}

/**
 * Hook to access focus mode state and controls.
 * Must be used within a {@link FocusProvider}.
 */
export const useFocus = () => useContext(FocusContext);

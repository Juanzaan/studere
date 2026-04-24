"use client";

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

export const useFocus = () => useContext(FocusContext);

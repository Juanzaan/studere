/**
 * Tutorial Context — provides a `restartTutorial` function to child components.
 *
 * Extracted from the app layout to avoid named exports in layout files,
 * which cause Next.js build type-check errors.
 *
 * @example
 * ```tsx
 * import { useTutorialContext } from "@/lib/tutorial-context";
 *
 * function MyComponent() {
 *   const { restartTutorial } = useTutorialContext();
 *   return <button onClick={restartTutorial}>Restart tour</button>;
 * }
 * ```
 */

import { createContext, useContext } from "react";

export interface TutorialContextValue {
  restartTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue>({
  restartTutorial: () => {},
});

export function useTutorialContext() {
  return useContext(TutorialContext);
}

export default TutorialContext;

"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Where Google (and any future OAuth provider) returns to. Clerk finishes the
 * handshake and then forwards to redirectUrlComplete, so this renders only a
 * brief holding state.
 */
export default function SSOCallbackPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#1A1714",
        color: "#A89B8C",
        fontFamily: "var(--font-space-mono), monospace",
        fontSize: 12,
        letterSpacing: "0.06em",
      }}
    >
      <p>Conectando…</p>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}

import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Entrar — Studere",
  description: "Iniciá sesión en Studere.",
};

export default function SignInPage() {
  return (
    <AuthShell>
      <AuthCard initialMode="login" />
    </AuthShell>
  );
}

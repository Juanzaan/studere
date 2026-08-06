import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Crear cuenta — Studere",
  description: "Creá tu cuenta Studere. Trial de 7 días, cancelás cuando quieras.",
};

export default function SignUpPage() {
  return (
    <AuthShell>
      <AuthCard initialMode="signup" />
    </AuthShell>
  );
}

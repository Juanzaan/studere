import type { Metadata } from "next";
import { SessionPageShell } from "@/components/session-page-shell";

export const metadata: Metadata = {
  title: "Sesión de estudio | Studere",
  description: "Resumen, flashcards, quiz y material de estudio generado con IA.",
  openGraph: {
    title: "Sesión de estudio | Studere",
    description: "Resumen, flashcards, quiz y material de estudio generado con IA.",
    type: "article",
    locale: "es_AR",
  },
};

export default function SessionPage({ params }: { params: { id: string } }) {
  return <SessionPageShell sessionId={params.id} />;
}

import type { Metadata } from "next";
import { SessionPageShell } from "@/components/session-page-shell";
import { getSessionById } from "@/lib/storage";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const session = getSessionById(params.id);
  
  if (!session) {
    return {
      title: "Sesión no encontrada | Studere",
      description: "La sesión que buscas no existe o fue eliminada.",
    };
  }

  const title = `${session.title} - ${session.course || "Studere"}`;
  const description = session.summary 
    ? session.summary.slice(0, 160) + "..."
    : `Sesión de estudio con ${session.flashcards.length} flashcards, ${session.quiz.length} preguntas de quiz y transcripción completa.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      locale: "es_AR",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function SessionPage({ params }: { params: { id: string } }) {
  return <SessionPageShell sessionId={params.id} />;
}

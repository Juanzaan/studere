import { StudySession } from "@/lib/types";

function firstSentence(value: string) {
  return value.split(/(?<=[.!?])\s+/)[0]?.trim() || value.trim();
}

function summaryParagraphs(summary: string): string[] {
  return summary.split(/\n\n+/).filter(Boolean);
}

export type BrainPromptTemplate = {
  id: string;
  label: string;
  prompt: string;
  icon: "sparkles" | "brain" | "clipboard" | "lightbulb" | "target" | "book";
};

export const BRAIN_PROMPT_TEMPLATES: BrainPromptTemplate[] = [
  { id: "summary", label: "Resumen clave", prompt: "Dame los puntos clave de esta sesión en formato ejecutivo, priorizando lo que necesito para un examen.", icon: "sparkles" },
  { id: "confusing", label: "Explicar dudas", prompt: "¿Cuáles son los conceptos más difíciles de esta sesión y cómo puedo entenderlos mejor?", icon: "lightbulb" },
  { id: "exam-prep", label: "Preparar examen", prompt: "Armame un plan de estudio para un examen basado en esta sesión: qué repasar primero, qué practicar y qué memorizar.", icon: "target" },
  { id: "action-items", label: "Tareas de estudio", prompt: "¿Qué tareas concretas debería completar antes de la próxima clase basándome en esta sesión?", icon: "clipboard" },
  { id: "connections", label: "Conexiones", prompt: "¿Cómo se conectan los temas de esta sesión con conceptos de mis otras sesiones de estudio?", icon: "brain" },
  { id: "deep-dive", label: "Profundizar", prompt: "Explicame en profundidad el tema principal de esta sesión como si fuera un tutor socrático.", icon: "book" },
];

function findRelevantTranscriptSegments(transcript: StudySession["transcript"], message: string) {
  const terms = message
    .toLowerCase()
    .split(/\s+/)
    .map((item) => item.replace(/[^a-z0-9áéíóúñ]/gi, ""))
    .filter((item) => item.length > 3);

  if (terms.length === 0) {
    return transcript.slice(0, 2);
  }

  return transcript
    .filter((segment) => terms.some((term) => segment.text.toLowerCase().includes(term) || segment.speaker.toLowerCase().includes(term)))
    .slice(0, 3);
}

function buildDeepSummary(session: StudySession): string {
  const parts: string[] = [];

  parts.push(`📋 **Resumen de "${session.title}"**`);
  parts.push("");

  if (session.summary && session.summary.length > 0) {
    const paras = summaryParagraphs(session.summary);
    parts.push(`Esta sesión aborda los siguientes temas principales:`);
    parts.push("");
    paras.slice(0, 4).forEach((p) => {
      parts.push(p);
      parts.push("");
    });
  }

  if (session.keyConcepts.length > 0) {
    parts.push(`Los conceptos centrales son ${session.keyConcepts.slice(0, 3).map((c) => `"${c.term}"`).join(", ")}.`);
    parts.push("");
    session.keyConcepts.slice(0, 3).forEach((c) => {
      parts.push(`**${c.term}**: ${c.description}`);
      parts.push("");
    });
  }

  const pendingTasks = session.actionItems.filter((t) => t.status === "pending");
  if (pendingTasks.length > 0) {
    parts.push(`Tareas pendientes: ${pendingTasks.map((t) => t.title).join("; ")}.`);
    parts.push("");
  }

  parts.push("¿Querés que profundice en alguno de estos puntos?");
  return parts.join("\n");
}

function buildExamPrep(session: StudySession): string {
  const parts: string[] = [];
  parts.push(`🎯 **Plan de preparación para examen — ${session.title}**`);
  parts.push("");

  parts.push("**Fase 1 — Comprensión profunda (hoy)**");
  parts.push("");
  const summaryParas = summaryParagraphs(session.summary).slice(0, 2);
  if (summaryParas.length > 0) {
    parts.push(`Empezá por releer estos puntos centrales y asegurate de poder explicarlos con tus propias palabras: ${summaryParas.map(firstSentence).join("; ")}.`);
  } else {
    parts.push("Empezá por releer todo el resumen de la sesión y marcá los puntos que no te quedan claros.");
  }
  parts.push("");

  parts.push("**Fase 2 — Memorización activa (mañana)**");
  parts.push("");
  if (session.flashcards.length > 0) {
    parts.push(`Repasá las ${session.flashcards.length} flashcards disponibles. Prestad especial atención a las de dificultad alta. Intentá responder en voz alta antes de voltear cada una.`);
  } else {
    parts.push("Creá tarjetas de estudio propias con los conceptos clave. La memorización activa es más efectiva que la relectura pasiva.");
  }
  parts.push("");

  parts.push("**Fase 3 — Práctica con tiempo (antes del examen)**");
  parts.push("");
  if (session.quiz.length > 0) {
    parts.push(`Resolvé las ${session.quiz.length} preguntas de práctica en condiciones de examen: sin consultar apuntes y controlando el tiempo. Después de cada error, escribí por qué elegiste la opción incorrecta y qué concepto te faltó.`);
  } else {
    parts.push("Buscá ejercicios de práctica relacionados con los temas de la sesión. Simular condiciones de examen mejora el rendimiento real.");
  }
  parts.push("");

  const accuracy = session.studyMetrics.quizAccuracy;
  if (accuracy > 0) {
    parts.push(`Tu rendimiento actual en quiz es ${accuracy}%.`);
    if (accuracy < 70) {
      parts.push("Con ese nivel te recomiendo repasar los conceptos que respondiste mal antes de hacer más ejercicios nuevos. Corregir errores tiene más impacto que practicar lo que ya sabés.");
    } else {
      parts.push("Tení un buen nivel. Ahora enfocate en los casos borde, las excepciones y los detalles que suelen aparecer en las últimas preguntas de los exámenes.");
    }
  } else {
    parts.push("📝 Todavía no completaste el quiz. Hacelo para medir tu nivel antes del examen y detectar qué temas necesitás reforzar.");
  }

  parts.push("");
  parts.push("¿Querés que te arme una lista priorizada de los temas más probables en el examen?");
  return parts.join("\n");
}

function buildConfusingParts(session: StudySession): string {
  const parts: string[] = [];
  parts.push(`💡 **Conceptos que suelen generar confusión — ${session.title}**`);
  parts.push("");

  if (session.keyConcepts.length > 0) {
    parts.push("Estos conceptos requieren atención especial. La mejor forma de verificar que los entendés es explicarlos en voz alta con tus propias palabras.");
    parts.push("");
  }

  session.keyConcepts.forEach((c, i) => {
    parts.push(`**${i + 1}. ${c.term}**`);
    parts.push("");
    parts.push(c.description);
    parts.push("");
    parts.push(`Un buen test: cerrá los apuntes y explicá qué es ${c.term.toLowerCase()} como si se lo contaras a alguien que nunca escuchó hablar del tema. Si te trabás en algún punto, ahí tenés qué repasar.`);
    parts.push("");
  });

  if (session.quiz.length > 0) {
    parts.push("**Autoevaluación rápida:**");
    parts.push("");
    parts.push("Intentá responder estas preguntas mentalmente antes de ver las respuestas. Si dudás más de 10 segundos, anotá el tema para repasar:");
    parts.push("");
    session.quiz.slice(0, 3).forEach((q) => {
      parts.push(`— ${q.question}`);
    });
  }

  parts.push("");
  parts.push("¿Hay algún concepto en particular que te cueste más? Puedo explicarlo paso a paso.");
  return parts.join("\n");
}

function buildTaskSuggestions(session: StudySession): string {
  const parts: string[] = [];
  parts.push(`📌 **Plan de trabajo sugerido — ${session.title}**`);
  parts.push("");

  if (session.actionItems.length > 0) {
    parts.push("Estas son las tareas actuales de la sesión:");
    parts.push("");
    session.actionItems.forEach((item) => {
      const status = item.status === "completed" ? "✅" : "⬜";
      parts.push(`${status} ${item.title} — ${item.dueLabel}`);
    });
    parts.push("");
  }

  parts.push("Además, te sugiero estas actividades de estudio activo:");
  parts.push("");
  parts.push(`1. Hacé el quiz completo y anotá en una hoja aparte qué preguntas fallaste y por qué. El error explicado vale más que la respuesta correcta memorizada.`);
  parts.push("");
  if (session.flashcards.length > 0) {
    parts.push(`2. Repasá las ${session.flashcards.length} flashcards disponibles. Intentá responder en voz alta antes de voltear cada una. El spacing effect (repasar antes de dormir) mejora la retención a largo plazo.`);
    parts.push("");
  }
  if (session.keyConcepts.length >= 3) {
    parts.push(`3. Creá un mapa mental propio en papel conectando ${session.keyConcepts.slice(0, 3).map((c) => `"${c.term}"`).join(", ")}. La organización visual que hacés vos misma es más valiosa que la que te da cualquier resumen.`);
    parts.push("");
  }

  parts.push("¿Querés que te sugiera un orden prioritario según tu progreso actual?");
  return parts.join("\n");
}

function buildSocraticDeepDive(session: StudySession): string {
  const mainTopic = session.keyConcepts[0]?.term || session.title;
  const parts: string[] = [];
  parts.push(`📖 **Análisis en profundidad — ${mainTopic}**`);
  parts.push("");

  parts.push(`Vamos a pensar juntos sobre ${mainTopic.toLowerCase()}. El objetivo no es memorizar la definición, sino entender por qué este concepto funciona como funciona.`);
  parts.push("");

  const firstPara = summaryParagraphs(session.summary)[0];
  if (firstPara) {
    parts.push(`Contexto de partida: ${firstPara}`);
    parts.push("");
  }

  parts.push("**Tres preguntas para profundizar:**");
  parts.push("");
  parts.push(`1. ¿Por qué es importante ${mainTopic.toLowerCase()} en el contexto de ${session.course || "esta materia"}? ¿Qué problemas resuelve que no se podrían resolver sin él?`);
  parts.push("");
  parts.push(`2. Imaginá que ${mainTopic.toLowerCase()} no existiera o funcionara de forma opuesta. ¿Qué consecuencias tendría eso en un caso real?`);
  parts.push("");
  parts.push(`3. Buscá un ejemplo concreto fuera del aula donde se use ${mainTopic.toLowerCase()}. Si no se usa directamente, ¿qué concepto relacionado sí se usa?`);
  parts.push("");

  if (session.keyConcepts.length >= 2) {
    parts.push(`**Conexión clave:** Pensá cómo se relacionan "${session.keyConcepts[0].term}" y "${session.keyConcepts[1].term}". ¿Son complementarios, opuestos, o uno depende del otro? A veces los conceptos que parecen similares son los más difíciles de distinguir.`);
    parts.push("");
  }

  parts.push("¿Querés que te guíe paso a paso por alguna de estas preguntas?");
  return parts.join("\n");
}

function buildCrossSessionContext(sessions: StudySession[], currentSession: StudySession): string {
  const otherSessions = sessions.filter((s) => s.id !== currentSession.id);
  if (otherSessions.length === 0) {
    return "Esta es tu única sesión por ahora. A medida que crees más sesiones, Stude podrá encontrar conexiones entre temas.";
  }

  const currentTerms = new Set(currentSession.keyConcepts.map((c) => c.term.toLowerCase()));
  const connections: Array<{ session: StudySession; sharedTerms: string[] }> = [];

  for (const other of otherSessions) {
    const shared = other.keyConcepts
      .filter((c) => currentTerms.has(c.term.toLowerCase()))
      .map((c) => c.term);

    if (shared.length > 0) {
      connections.push({ session: other, sharedTerms: shared });
    }
  }

  if (connections.length === 0) {
    const relatedByCourse = otherSessions.filter((s) => s.course && s.course.toLowerCase() === currentSession.course?.toLowerCase());
    if (relatedByCourse.length > 0) {
      return `🔗 No encontré conceptos compartidos, pero tenés ${relatedByCourse.length} sesión(es) más de ${currentSession.course}: ${relatedByCourse.slice(0, 3).map((s) => `"${s.title}"`).join(", ")}. Revisalas para encontrar conexiones temáticas.`;
    }
    return "🔗 Todavía no encontré conexiones directas con tus otras sesiones. A medida que estudies más temas relacionados, las conexiones van a aparecer automáticamente.";
  }

  const parts = [`🔗 **Conexiones con otras sesiones:**`, ""];
  connections.slice(0, 4).forEach((conn) => {
    parts.push(`• **"${conn.session.title}"** (${conn.session.course || "sin materia"}) comparte: ${conn.sharedTerms.join(", ")}`);
  });

  return parts.join("\n");
}

export function buildBrainReply(session: StudySession, message: string, allSessions?: StudySession[]) {
  const normalized = message.toLowerCase();

  if (normalized.includes("resumen") || normalized.includes("summary") || normalized.includes("takeaway") || normalized.includes("punto")) {
    return buildDeepSummary(session);
  }

  if (normalized.includes("confus") || normalized.includes("dificil") || normalized.includes("entend") || normalized.includes("explain")) {
    return buildConfusingParts(session);
  }

  if (normalized.includes("examen") || normalized.includes("exam") || normalized.includes("parcial") || normalized.includes("prepar") || normalized.includes("evalua")) {
    return buildExamPrep(session);
  }

  if (normalized.includes("tarea") || normalized.includes("task") || normalized.includes("accion") || normalized.includes("siguiente") || normalized.includes("next") || normalized.includes("step")) {
    return buildTaskSuggestions(session);
  }

  if (normalized.includes("conex") || normalized.includes("relacion") || normalized.includes("connect") || normalized.includes("otras sesion") || normalized.includes("cross")) {
    if (allSessions) {
      return buildCrossSessionContext(allSessions, session);
    }
    return "Para encontrar conexiones entre sesiones, necesito acceso a tu biblioteca completa. Creá más sesiones y volvé a preguntar.";
  }

  if (normalized.includes("profund") || normalized.includes("deep") || normalized.includes("socrat") || normalized.includes("tutor") || normalized.includes("explica")) {
    return buildSocraticDeepDive(session);
  }

  if (normalized.includes("concept") || normalized.includes("tema") || normalized.includes("clave") || normalized.includes("key")) {
    const parts = [`📚 **Conceptos clave de "${session.title}"**`, ""];
    if (session.keyConcepts.length === 0) {
      parts.push("Todavía no tengo conceptos clave registrados para esta sesión. Probá pedirme un resumen general primero.");
    } else {
      parts.push(`Estos son los conceptos más importantes de la sesión. No los memorices de forma aislada: intentá conectar cada uno con el tema general y con los demás conceptos.`);
      parts.push("");
      session.keyConcepts.forEach((c, i) => {
        parts.push(`**${i + 1}. ${c.term}**`);
        parts.push("");
        parts.push(c.description);
        parts.push("");
      });
    }
    parts.push("¿Querés que profundice en alguno de estos conceptos con un ejemplo concreto?");
    return parts.join("\n");
  }

  if (normalized.includes("quiz") || normalized.includes("pregunta") || normalized.includes("question") || normalized.includes("practice")) {
    const parts = [`📝 **Preguntas de práctica — ${session.title}**`, ""];
    if (session.quiz.length === 0) {
      parts.push("Todavía no hay preguntas de práctica para esta sesión. Te puedo armar un plan de repaso basado en los conceptos clave.");
    } else {
      parts.push(`Acá tení ${session.quiz.length} preguntas de práctica. Intentá responderlas mentalmente antes de ver la respuesta correcta. Si dudás, anotá el concepto que necesitás repasar.`);
      parts.push("");
      session.quiz.forEach((q, i) => {
        parts.push(`**${i + 1}.** ${q.question}`);
        parts.push("");
        parts.push(`Respuesta correcta: **${q.options?.[q.correct] || "No disponible"}**`);
        if (q.explanation) {
          parts.push("");
          parts.push(q.explanation);
        }
        parts.push("");
      });
    }
    parts.push("¿Querés que te explique por qué alguna respuesta es correcta paso a paso?");
    return parts.join("\n");
  }

  if (normalized.includes("flashcard") || normalized.includes("repaso") || normalized.includes("memor") || normalized.includes("review")) {
    const parts = [`🃏 **Flashcards para repasar — ${session.title}**`, ""];
    if (session.flashcards.length === 0) {
      parts.push("Todavía no hay flashcards generadas. Te puedo sugerir un método de repaso alternativo con los conceptos clave.");
    } else {
      parts.push(`Tení ${session.flashcards.length} flashcards. La regla de oro: intentá responder en voz alta ANTES de ver la respuesta. Eso activa la memorización activa en lugar de la relectura pasiva.`);
      parts.push("");
      session.flashcards.forEach((f, i) => {
        parts.push(`**${i + 1}.** ${f.question}`);
        parts.push("");
        parts.push(`Respuesta: ${f.answer}`);
        parts.push("");
      });
    }
    parts.push("¿Querés que te dé una estrategia para repasar las que te cuestan más?");
    return parts.join("\n");
  }

  const matches = findRelevantTranscriptSegments(session.transcript, message);

  if (matches.length > 0) {
    const parts = [`🔍 **Fragmentos relevantes del transcript**`, ""];
    parts.push(`Encontré ${matches.length} parte(s) del transcript que podrían responder tu pregunta. Te los muestro tal cual aparecen para que tengas el contexto original:`);
    parts.push("");
    matches.forEach((seg) => {
      parts.push(`**[${seg.timestamp}] ${seg.speaker}:**`);
      parts.push(seg.text);
      parts.push("");
    });
    parts.push("¿Querés que te explique en palabras más simples lo que dice este fragmento?");
    return parts.join("\n");
  }

  return buildDeepSummary(session);
}

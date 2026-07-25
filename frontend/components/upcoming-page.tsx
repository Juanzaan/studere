"use client";

import { useRef } from "react";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";

const UPCOMING_ITEMS = [
  {
    title: "Repaso de Parcial I",
    time: "Hoy · 18:00",
    description: "Usa Stude para resumir tu última clase y repasar conceptos antes del examen.",
  },
  {
    title: "Clase online de Historia Económica",
    time: "Mañana · 09:30",
    description: "Prepará una sesión con Record online class y captura la transcripción en cuanto termine.",
  },
];

export function UpcomingPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useFadeInStagger(headerRef, ".upcoming-header", { y: 16, stagger: 0.06, duration: 0.5 });
  useFadeInStagger(itemsRef, ".upcoming-item", { y: 12, stagger: 0.1, duration: 0.4, delay: 0.2 });
  useFadeInStagger(calendarRef, ".upcoming-cal", { y: 12, duration: 0.4, delay: 0.35 });

  return (
    <div className="space-y-4">
      <div ref={headerRef}>
        <h2 className="upcoming-header text-[16px] font-semibold text-c-text">Próximos eventos</h2>
        <p className="upcoming-header mt-1 text-[12px] text-c-muted">Agenda de clases, repasos y sesiones online orientada a tu flujo post-clase.</p>
      </div>

      <div ref={itemsRef} className="space-y-3">
        {UPCOMING_ITEMS.map((item) => (
          <div key={item.title} className="upcoming-item rounded-panel border border-c-border bg-c-surface p-4 card-interactive">
            <div className="flex flex-wrap items-center gap-2">
              <Clock3 className="h-[12px] w-[12px] text-c-muted" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-c-muted">{item.time}</span>
            </div>
            <h3 className="mt-2 text-[13px] font-medium text-c-text">{item.title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-c-muted">{item.description}</p>
          </div>
        ))}
      </div>

      <div ref={calendarRef} className="upcoming-cal rounded-panel border border-c-border bg-c-surface p-4 card-interactive">
        <h3 className="text-[13px] font-medium text-c-text">Conectá tu calendario</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-c-muted">Sincronizá Google Calendar u Outlook para detectar clases futuras.</p>
        <div className="mt-3 space-y-2">
          <Link href="/integrations" className="block rounded-card border border-c-border bg-c-surface-2 px-4 py-2.5 text-center text-[12px] text-c-muted transition-colors hover:bg-c-surface focus-visible:outline-none">
            Conectar Google Calendar
          </Link>
          <Link href="/integrations" className="block rounded-card border border-c-border bg-c-surface-2 px-4 py-2.5 text-center text-[12px] text-c-muted transition-colors hover:bg-c-surface focus-visible:outline-none">
            Conectar Microsoft Outlook
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Clock3 } from "lucide-react";

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
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold text-c-text">Próximos eventos</h2>
        <p className="mt-1 text-[12px] text-c-muted">Agenda de clases, repasos y sesiones online orientada a tu flujo post-clase.</p>
      </div>

      <div className="space-y-3">
        {UPCOMING_ITEMS.map((item) => (
          <div key={item.title} className="rounded-panel border border-c-border bg-c-surface p-4 transition-colors hover:bg-c-surface-2">
            <div className="flex flex-wrap items-center gap-2">
              <Clock3 className="h-[12px] w-[12px] text-c-muted" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-c-muted">{item.time}</span>
            </div>
            <h3 className="mt-2 text-[13px] font-medium text-c-text">{item.title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-c-muted">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-panel border border-c-border bg-c-surface p-4">
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

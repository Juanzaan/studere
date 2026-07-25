"use client";

import { useRef, useState } from "react";
import { Calendar, Chrome, Cloud, MessageSquareShare, Workflow } from "lucide-react";
import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";

const INTEGRATIONS = [
  {
    name: "Google Calendar",
    description: "Detecta próximas clases y prepara la captura automática.",
    icon: Calendar,
  },
  {
    name: "Microsoft Outlook",
    description: "Ideal para horarios académicos, tutorías y reuniones de equipo.",
    icon: Calendar,
  },
  {
    name: "Google Drive / Dropbox",
    description: "Trae grabaciones y transcribe contenido remoto desde archivos compartidos.",
    icon: Cloud,
  },
  {
    name: "Slack / Discord",
    description: "Comparte AI notes, tareas y resúmenes con tus grupos de estudio.",
    icon: MessageSquareShare,
  },
  {
    name: "Chrome Extension",
    description: "Captura contenido y abre Studere desde el navegador con un click.",
    icon: Chrome,
  },
  {
    name: "Automatizaciones",
    description: "Dispara resúmenes, exportaciones y flujos post-clase automáticamente.",
    icon: Workflow,
  },
];

export function IntegrationsPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const FEATURE_ENABLED = false;
  const [connecting, setConnecting] = useState<string | null>(null);

  useFadeInStagger(headerRef, ".int-header", { y: 16, stagger: 0.06, duration: 0.5 });
  useFadeInStagger(gridRef, ".int-card", { y: 12, stagger: 0.05, duration: 0.4, delay: 0.2, scale: 0.96, ease: "smooth" });

  function handleConnect(name: string) {
    setConnecting(name);
    setTimeout(() => {
      setConnecting(null);
    }, 1500);
  }

  return (
    <div className="rounded-panel border border-c-border bg-c-surface p-5">
      <div ref={headerRef} className="space-y-3">
        <h1 className="int-header text-[16px] font-semibold text-c-text">Integraciones</h1>
        <p className="int-header max-w-3xl text-[12px] leading-relaxed text-c-muted">
          Tu estudio no es un silo: conecta Studere con calendario, archivos, automatizaciones y canales compartidos.
        </p>
        {!FEATURE_ENABLED && (
          <div className="int-header rounded-card border border-c-amber/20 bg-c-amber-soft px-4 py-3 text-[12px] text-c-amber">
            Las integraciones están en desarrollo. Estarán disponibles próximamente.
          </div>
        )}
      </div>

      <div ref={gridRef} className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;

          return (
            <div key={integration.name} className="int-card rounded-panel border border-c-border bg-c-surface p-4 card-interactive">
              <div className="flex h-10 w-10 items-center justify-center rounded-btn border border-c-blue-border bg-c-blue-soft text-c-blue">
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <h2 className="mt-3 text-[13px] font-semibold text-c-text">{integration.name}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-c-muted">{integration.description}</p>
              <button
                onClick={FEATURE_ENABLED ? () => handleConnect(integration.name) : undefined}
                disabled={!FEATURE_ENABLED || connecting === integration.name}
                className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-btn border border-c-border bg-c-surface-2 px-4 text-[11px] font-semibold text-c-muted transition-colors hover:bg-c-blue-soft hover:text-c-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-c-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                {!FEATURE_ENABLED ? "Próximamente" : connecting === integration.name ? "Conectando..." : "Conectar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Calendar, Chrome, Cloud, MessageSquareShare, Workflow } from "lucide-react";

const INTEGRATIONS = [
  {
    name: "Google Calendar",
    description: "Detecta próximas clases y prepara la captura automática.",
    icon: Calendar,
    accent: "bg-sky-50 text-sky-600",
  },
  {
    name: "Microsoft Outlook",
    description: "Ideal para horarios académicos, tutorías y reuniones de equipo.",
    icon: Calendar,
    accent: "bg-indigo-50 text-indigo-600",
  },
  {
    name: "Google Drive / Dropbox",
    description: "Trae grabaciones y transcribe contenido remoto desde archivos compartidos.",
    icon: Cloud,
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "Slack / Discord",
    description: "Comparte AI notes, tareas y resúmenes con tus grupos de estudio.",
    icon: MessageSquareShare,
    accent: "bg-violet-50 text-violet-600",
  },
  {
    name: "Chrome Extension",
    description: "Captura contenido y abre Studere desde el navegador con un click.",
    icon: Chrome,
    accent: "bg-amber-50 text-amber-600",
  },
  {
    name: "Automatizaciones",
    description: "Dispara resúmenes, exportaciones y flujos post-clase automáticamente.",
    icon: Workflow,
    accent: "bg-rose-50 text-rose-600",
  },
];

export function IntegrationsPage() {
  const FEATURE_ENABLED = false;
  const [connecting, setConnecting] = useState<string | null>(null);

  function handleConnect(name: string) {
    setConnecting(name);
    // Simular conexión
    setTimeout(() => {
      setConnecting(null);
      // En producción: mostrar toast o modal de éxito
    }, 1500);
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Integraciones</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        Tu estudio no es un silo: conecta Studere con calendario, archivos, automatizaciones y canales compartidos.
      </p>
      {!FEATURE_ENABLED && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Las integraciones están en desarrollo. Estarán disponibles próximamente.
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;

          return (
            <div key={integration.name} className="rounded-[24px] border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card dark:border-slate-700 dark:bg-slate-900">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${integration.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{integration.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{integration.description}</p>
              <button
                onClick={FEATURE_ENABLED ? () => handleConnect(integration.name) : undefined}
                disabled={!FEATURE_ENABLED || connecting === integration.name}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-all duration-150 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-violet-500 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
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

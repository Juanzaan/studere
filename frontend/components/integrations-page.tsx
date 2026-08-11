"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Chrome, Cloud, MessageSquareShare, Workflow, type LucideIcon } from "lucide-react";
import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";
import {
  INTEGRATION_DEFINITIONS,
  INTEGRATIONS_UPDATED_EVENT,
  connectIntegration,
  disconnectIntegration,
  getConnectedIntegrations,
  type IntegrationCategory,
} from "@/lib/integrations";

/**
 * Integrations page — registry-driven catalogue of third-party integrations.
 *
 * Cards reflect the real persisted connection state (Conectada/Desconectada)
 * via {@link INTEGRATION_DEFINITIONS} and localStorage. OAuth flows are
 * wired-up placeholders: builtin integrations connect locally, while oauth
 * ones require owner-provided credentials (see lib/integrations.ts).
 *
 * Stagger animations with scale+fade+ease-smooth.
 */

const CATEGORY_ICONS: Record<IntegrationCategory, LucideIcon> = {
  calendar: Calendar,
  files: Cloud,
  messaging: MessageSquareShare,
  extension: Chrome,
  automation: Workflow,
};

export function IntegrationsPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState<string[]>(() => getConnectedIntegrations());
  const [connecting, setConnecting] = useState<string | null>(null);

  useFadeInStagger(headerRef, ".int-header", { y: 16, stagger: 0.06, duration: 0.5 });
  useFadeInStagger(gridRef, ".int-card", { y: 12, stagger: 0.05, duration: 0.4, delay: 0.2, scale: 0.96, ease: "smooth" });

  useEffect(() => {
    const refresh = () => setConnected(getConnectedIntegrations());
    window.addEventListener(INTEGRATIONS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(INTEGRATIONS_UPDATED_EVENT, refresh);
  }, []);

  function handleConnect(id: string) {
    setConnecting(id);
    setTimeout(() => {
      connectIntegration(id);
      setConnecting(null);
    }, 900);
  }

  function handleDisconnect(id: string) {
    disconnectIntegration(id);
  }

  const anyConnected = connected.length > 0;

  return (
    <div className="rounded-panel border border-c-border bg-c-surface p-5">
      <div ref={headerRef} className="space-y-3">
        <h1 className="int-header text-[16px] font-semibold text-c-text">Integraciones</h1>
        <p className="int-header max-w-3xl text-[12px] leading-relaxed text-c-muted">
          Tu estudio no es un silo: conecta Studere con calendario, archivos, automatizaciones y canales compartidos.
        </p>
        {!anyConnected && (
          <div className="int-header rounded-card border border-c-amber/20 bg-c-amber-soft px-4 py-3 text-[12px] text-c-amber">
            Las integraciones reales están en desarrollo. Podés conectar las integraciones locales y el resto
            estará disponible próximamente.
          </div>
        )}
      </div>

      <div ref={gridRef} className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATION_DEFINITIONS.map((integration) => {
          const Icon = CATEGORY_ICONS[integration.category];
          const isConnected = connected.includes(integration.id);
          const isConnecting = connecting === integration.id;

          return (
            <div key={integration.id} className="int-card rounded-panel border border-c-border bg-c-surface p-4 card-interactive">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-btn border border-c-blue-border bg-c-blue-soft text-c-blue">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    isConnected ? "bg-c-green-soft text-c-green" : "bg-c-surface-2 text-c-muted"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full opacity-70 ${isConnected ? "bg-c-green" : "bg-c-muted"}`} />
                  {isConnected ? "Conectada" : "Desconectada"}
                </span>
              </div>
              <h2 className="mt-3 text-[13px] font-semibold text-c-text">{integration.name}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-c-muted">{integration.description}</p>
              {integration.auth === "oauth" && (
                <p className="mt-1 text-[10px] leading-relaxed text-c-muted/70">
                  Requiere credenciales del proveedor (disponible próximamente).
                </p>
              )}
              <button
                onClick={() => (isConnected ? handleDisconnect(integration.id) : handleConnect(integration.id))}
                disabled={isConnecting}
                className={`mt-4 inline-flex h-9 w-full items-center justify-center rounded-btn border px-4 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-c-blue disabled:cursor-not-allowed disabled:opacity-50 ${
                  isConnected
                    ? "border-c-border bg-c-surface-2 text-c-muted hover:bg-c-red-soft hover:text-c-red"
                    : "border-c-blue-border bg-c-blue-soft text-c-blue hover:bg-c-blue"
                }`}
              >
                {isConnecting ? "Conectando..." : isConnected ? "Desconectar" : "Conectar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

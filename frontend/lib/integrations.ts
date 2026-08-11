/**
 * Integrations persistence layer — registry + connection state for third-party
 * integrations.
 *
 * Connection state lives in localStorage keyed per user, independent from
 * session storage. Follows the repo's storage conventions: normalize on read
 * (unknown/duplicate ids are dropped, missing data means "nothing connected"),
 * never crash on corrupt data, and dispatch {@link INTEGRATIONS_UPDATED_EVENT}
 * on writes for reactive UI updates.
 */

import { canUseStorage, safeGetItem, safeSetItem } from "@/lib/local-storage-guard";

export const INTEGRATIONS_KEY = "studere.integrations.v1";

/** Custom event dispatched on successful integration write. */
export const INTEGRATIONS_UPDATED_EVENT = "studere:integrations-updated";

export type IntegrationCategory = "calendar" | "files" | "messaging" | "extension" | "automation";

/**
 * How the integration connects. `oauth` integrations need third-party
 * credentials (owner-provided, never committed); `builtin` ones connect
 * locally without external accounts.
 */
export type IntegrationAuthKind = "oauth" | "builtin";

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  auth: IntegrationAuthKind;
}

/**
 * MVP integration set. The full catalogue stays on the integrations page; this
 * is the ordered subset that has a concrete product meaning today.
 */
export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Detecta próximas clases y prepara la captura automática.",
    category: "calendar",
    auth: "oauth",
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Ideal para horarios académicos, tutorías y reuniones de equipo.",
    category: "calendar",
    auth: "oauth",
  },
  {
    id: "drive-dropbox",
    name: "Google Drive / Dropbox",
    description: "Trae grabaciones y transcribe contenido remoto desde archivos compartidos.",
    category: "files",
    auth: "oauth",
  },
  {
    id: "slack-discord",
    name: "Slack / Discord",
    description: "Comparte AI notes, tareas y resúmenes con tus grupos de estudio.",
    category: "messaging",
    auth: "oauth",
  },
  {
    id: "chrome-extension",
    name: "Chrome Extension",
    description: "Captura contenido y abre Studere desde el navegador con un click.",
    category: "extension",
    auth: "builtin",
  },
  {
    id: "automations",
    name: "Automatizaciones",
    description: "Dispara resúmenes, exportaciones y flujos post-clase automáticamente.",
    category: "automation",
    auth: "builtin",
  },
];

const VALID_IDS = new Set(INTEGRATION_DEFINITIONS.map((integration) => integration.id));

function emitIntegrationsUpdated() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(INTEGRATIONS_UPDATED_EVENT));
}

/**
 * Retrieve the ids of all currently connected integrations, normalized.
 * Returns an empty array if storage is unavailable, data is corrupt, or
 * nothing is connected yet.
 */
export function getConnectedIntegrations(): string[] {
  if (!canUseStorage()) return [];
  const raw = safeGetItem(INTEGRATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((id): id is string => typeof id === "string" && VALID_IDS.has(id))));
  } catch {
    return [];
  }
}

/** Whether the given integration is currently connected. */
export function isIntegrationConnected(id: string): boolean {
  return getConnectedIntegrations().includes(id);
}

/**
 * Mark an integration as connected and persist the change.
 *
 * @param id - Integration id (must be part of {@link INTEGRATION_DEFINITIONS})
 * @returns True if the connection state was persisted
 */
export function connectIntegration(id: string): boolean {
  if (!VALID_IDS.has(id) || !canUseStorage()) return false;
  const connected = getConnectedIntegrations();
  if (!connected.includes(id)) {
    connected.push(id);
  }
  const success = safeSetItem(INTEGRATIONS_KEY, JSON.stringify(connected));
  if (success) {
    emitIntegrationsUpdated();
  }
  return success;
}

/** Mark an integration as disconnected and persist the change. */
export function disconnectIntegration(id: string) {
  if (!canUseStorage() || !VALID_IDS.has(id)) return;
  const connected = getConnectedIntegrations().filter((connectedId) => connectedId !== id);
  const success = safeSetItem(INTEGRATIONS_KEY, JSON.stringify(connected));
  if (success) {
    emitIntegrationsUpdated();
  }
}

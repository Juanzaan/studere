"use client";

import { useState } from "react";
import { seedMockData } from "@/lib/seed-data";
import { useRouter } from "next/navigation";

/**
 * Dev-only seed page — generates realistic mock data to test charts, library, and dashboards.
 *
 * @see seedMockData
 */
export default function DevSeedPage() {
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleSeed() {
    setLoading(true);
    // Small delay so the UI updates before the potentially blocking localStorage write
    setTimeout(() => {
      try {
        seedMockData();
        setSeeded(true);
      } catch (e) {
        console.error("Seed failed", e);
      } finally {
        setLoading(false);
      }
    }, 100);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-c-bg p-6">
      <div className="w-full max-w-md rounded-panel border border-c-border bg-c-surface p-8 text-center shadow-lg">
        <div className="mb-6 text-4xl">🧪</div>
        <h1 className="mb-2 text-xl font-bold text-c-text">Generar datos de ejemplo</h1>
        <p className="mb-6 text-[13px] leading-relaxed text-c-muted">
          Esto va a poblar la app con <strong>8 sesiones</strong> de 4 materias distintas,
          <strong> quizzes</strong> y <strong>repasos</strong> simulando 7 días de actividad.
          Los datos actuales se van a reemplazar.
        </p>

        {seeded ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-c-teal-soft p-4 text-[13px] text-c-teal">
              ✅ Datos generados correctamente
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/analytics")}
                className="flex-1 rounded-lg bg-c-blue px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-c-blue/90"
              >
                📊 Ver Analytics
              </button>
              <button
                onClick={() => router.push("/library")}
                className="flex-1 rounded-lg bg-c-violet px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-c-violet/90"
              >
                📚 Ver Library
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full rounded-lg bg-c-blue px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-c-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generando..." : "🚀 Generar datos de ejemplo"}
          </button>
        )}

        <p className="mt-6 text-[11px] text-c-muted">
          {seeded
            ? "Los datos persisten en localStorage. Recargá la página para limpiarlos o volvé a generar."
            : "Esto solo afecta a tu navegador actual — no hay datos en servidor."}
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getSessionById } from "@/lib/storage";
import { StudySession } from "@/lib/types";
import { SessionDetail } from "@/components/session-detail";

export function SessionPageShell({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<StudySession | null | undefined>(undefined);

  useEffect(() => {
    setSession(getSessionById(sessionId));
  }, [sessionId]);

  if (session === undefined) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <p className="text-sm text-slate-500">Cargando sesión...</p>
          </div>
        </div>
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="max-w-sm rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-slate-900">Sesión no encontrada</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Puede haber sido eliminada o creada en otro navegador.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95">
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <SessionDetail session={session} />;
}

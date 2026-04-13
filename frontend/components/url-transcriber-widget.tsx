"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Link2, Loader2, Sparkles } from "lucide-react";
import { analyzeUrl, transcribeFromUrl } from "@/lib/url-transcriber";
import { createStudySession } from "@/lib/study-generator";
import { upsertSession } from "@/lib/storage";

export function UrlTranscriberWidget() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [course, setCourse] = useState("");
  const [state, setState] = useState<"idle" | "processing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeUrl> | null>(null);

  function handleUrlChange(value: string) {
    setUrl(value);
    try {
      if (value.trim().length > 8) {
        setAnalysis(analyzeUrl(value.trim()));
      } else {
        setAnalysis(null);
      }
    } catch {
      setAnalysis(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) return;

    setState("processing");
    setErrorMsg("");

    try {
      const result = await transcribeFromUrl(url.trim());

      const session = createStudySession({
        title: result.title,
        course: course.trim(),
        notes: result.text,
        sourceUrl: result.sourceUrl,
        templateId: "class-summary",
      });

      upsertSession(session);
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar la URL");
    }
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
          {state === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {state === "idle" && "Transcribir desde URL"}
            {state === "processing" && "Procesando URL..."}
            {state === "error" && "Error de procesamiento"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {state === "idle" && "Pegá un link de YouTube, Google Drive o cualquier recurso web."}
            {state === "processing" && "Analizando contenido y generando tu workspace de estudio..."}
            {state === "error" && errorMsg}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">URL de origen</span>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=... o cualquier URL"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
            />
          </div>
          {analysis && (
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                analysis.type === "youtube" ? "bg-red-50 text-red-700" :
                analysis.type === "remote-file" ? "bg-emerald-50 text-emerald-700" :
                "bg-sky-50 text-sky-700"
              }`}>
                {analysis.type === "youtube" ? "YouTube" : analysis.type === "remote-file" ? "File" : "Web"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{analysis.label}</span>
            </div>
          )}
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Materia / curso (opcional)</span>
          <input
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Ej. Historia económica"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!url.trim() || state === "processing"}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {state === "processing" ? "Procesando..." : "Transcribir y crear sesión"}
          </button>

          {state === "error" && (
            <button
              type="button"
              onClick={() => { setState("idle"); setErrorMsg(""); }}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Reintentar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

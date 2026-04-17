import Link from "next/link";
import { CalendarDays, Clock3, GraduationCap } from "lucide-react";

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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Próximos eventos</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Agenda de clases, repasos y sesiones online orientada a tu flujo post-clase.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {UPCOMING_ITEMS.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {item.time}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
          <GraduationCap className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Conectá tu calendario</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Sincroniza Google Calendar u Outlook para detectar clases futuras y disparar el flujo de captura más rápido.</p>
        <div className="mt-4 space-y-2">
          <Link href="/integrations" className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            Conectar Google Calendar
          </Link>
          <Link href="/integrations" className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            Conectar Microsoft Outlook
          </Link>
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Star,
  Check,
  Mic,
  Camera,
  FileText,
  Monitor,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   PALETTE
   ═══════════════════════════════════════════════════════════════════════ */

const P = {
  bg: "#F3EEDF",
  card: "#FBF8EF",
  ink: "#1E2733",
  soft: "#5B6472",
  marker: "#FFD34D",
  moss: "#3F6B4A",
  crimson: "#C1272D",
  bdr: "rgba(30,39,51,0.14)",
  bdrS: "rgba(30,39,51,0.09)",
  sh: "rgba(30,39,51,0.08)",
  ringBg: "#B5A891",
} as const;

const F = {
  fra: "var(--font-fraunces)",
  sans: "var(--font-public-sans)",
  mono: "var(--font-space-mono)",
} as const;

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */

const TOOLS = [
  {
    id: "transcribe",
    num: "01",
    label: "TRANSCRIPCIÓN",
    title: "Subí la clase, obtené el texto",
    desc: "Audio o video de hasta 2 horas. La IA transcribe todo con alta precisión.",
    tag: "AUDIO → TEXTO",
  },
  {
    id: "summary",
    num: "02",
    label: "RESUMEN",
    title: "Lo importante, ordenado",
    desc: "No un muro de texto — conceptos clave, bien separados y explicados.",
    tag: "SÍNTESIS IA",
  },
  {
    id: "flashcards",
    num: "03",
    label: "FLASHCARDS",
    title: "Se arman solas",
    desc: "Generadas del contenido real de la clase, con repetición espaciada.",
    tag: "REPASO ACTIVO",
  },
  {
    id: "mindmap",
    num: "04",
    label: "MAPA MENTAL",
    title: "Los temas, conectados",
    desc: "Visualizá cómo se relacionan los conceptos entre sí.",
    tag: "VISUAL",
  },
  {
    id: "stude",
    num: "05",
    label: "STUDE TUTOR",
    title: "Preguntale a la IA",
    desc: "Chat con contexto de tu clase — resolvé dudas al instante.",
    tag: "TUTOR IA",
  },
];

const INPUTS_DATA = [
  { icon: Mic, title: "Audio de la clase", desc: "Hasta 2+ horas, se transcribe por partes sin trabarse.", rotate: "-2deg" },
  { icon: Monitor, title: "Grabación de pantalla", desc: "Video de la clase o de tu propia sesión de estudio.", rotate: "1deg" },
  { icon: FileText, title: "Apuntes o transcript", desc: "Pegá texto o subí un .txt / .md, sin pasos extra.", rotate: "-1deg" },
  { icon: Camera, title: "Foto del pizarrón", desc: "O de un ejercicio resuelto — Stude te lo corrige.", rotate: "2deg" },
];

const TESTIMONIALS = [
  { text: "Studere me salvó el final. Cargué la grabación y en 5 minutos tenía flashcards y resumen.", author: "Lucía M.", role: "Medicina", rotate: "-2.2deg" },
  { text: "El mapa mental conectó temas que ni sabía que estaban relacionados. Una masa.", author: "Tomás G.", role: "Ing. en Sistemas", rotate: "1.6deg" },
];

/* Beat thresholds for ring scroll (progress 0–1) */
const BEATS = [0, 0.12, 0.28, 0.44, 0.6, 0.76, 0.9, 1.0];
const RING_SLATS_DESKTOP = 42;
const RING_SLATS_MOBILE = 24;
const RING_RADIUS_DESKTOP = 250;
const RING_RADIUS_MOBILE = 140;

/* ═══════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function Grain() {
  return <div className="paper-grain" aria-hidden="true" />;
}

function Squiggly() {
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
    p.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.65,0,.35,1)";
    const raf = requestAnimationFrame(() => { p.style.strokeDashoffset = "0"; });
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <svg width="70" height="10" viewBox="0 0 70 10" className="ml-1 -translate-y-0.5">
      <path ref={ref} d="M2 7 Q 18 1, 35 6 T 68 4" stroke={P.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SectionHead({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mb-10 max-w-4xl px-4 text-center sm:px-6">
      <span className="mb-2 block text-[10px] tracking-[0.2em]" style={{ fontFamily: F.mono, color: P.soft }}>
        {eyebrow}
      </span>
      <h2 className="text-xl font-medium sm:text-2xl" style={{ fontFamily: F.fra, color: P.ink }}>
        {children}
      </h2>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MINI DEMOS (for ring panel)
   ═══════════════════════════════════════════════════════════════════════ */

function WaveformDemo() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 20), 180);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex items-end gap-1" style={{ height: 70 }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const h = 18 + Math.sin(i * 0.8 + phase * 0.3) * 16 + Math.sin(i * 1.7 + phase * 0.5) * 10 + 12;
          return (
            <div key={i} className="w-1.5 rounded-t-sm" style={{
              height: `${Math.max(6, h)}%`,
              backgroundColor: i % 3 === 0 ? P.moss : i % 3 === 2 ? P.ink : P.soft,
              opacity: 0.4 + ((i + phase) % 14) / 14 * 0.6,
              transition: "height 0.18s ease, opacity 0.18s ease",
            }} />
          );
        })}
      </div>
      <div className="w-full space-y-2 rounded-lg border p-3" style={{ borderColor: P.bdr, backgroundColor: P.card }}>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: P.crimson }} />
          <span style={{ fontFamily: F.mono, fontSize: 9, color: P.soft }}>GRABANDO 18:42</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: P.ink }}>
          <span className="opacity-40">La célula es la unidad fundamental...</span>{" "}
          <span style={{ backgroundColor: P.marker }} className="px-0.5">Las eucariotas tienen núcleo definido</span>{" "}
          <span className="opacity-100">y organelas como las mitocondrias.</span>
        </p>
      </div>
    </div>
  );
}

function SummaryDemo() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setV((p) => (p >= 4 ? 0 : p + 1)), 800);
    return () => clearInterval(t);
  }, []);
  const bullets = [
    { text: "La mitocondria produce energía (ATP)", hl: true },
    { text: "El núcleo guarda el ADN celular", hl: false },
    { text: "La membrana regula el intercambio", hl: false },
    { text: "Los ribosomas sintetizan proteínas", hl: false },
  ];
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="rounded-lg border p-4" style={{ borderColor: P.bdr, backgroundColor: P.card }}>
        <h3 className="mb-2 text-sm font-medium" style={{ fontFamily: F.fra, color: P.ink }}>Biología celular — resumen</h3>
        <div className="mb-3 space-y-1.5">
          <div className="h-2 rounded" style={{ width: "92%", backgroundColor: P.bdr }} />
          <div className="h-2 rounded" style={{ width: "85%", backgroundColor: P.bdr }} />
        </div>
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{
              opacity: i <= v ? 1 : 0, transform: i <= v ? "translateY(0)" : "translateY(6px)",
              transition: "all 0.4s ease", color: P.ink,
            }}>
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: P.moss }} />
              {b.hl ? <span className="px-0.5" style={{ backgroundColor: P.marker }}>{b.text}</span> : <span style={{ color: P.soft }}>{b.text}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FlashcardDemo() {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    const c = setInterval(() => setFlip((f) => !f), 3500);
    return () => clearInterval(c);
  }, []);
  return (
    <div className="flex flex-col items-center gap-3 py-2" style={{ perspective: 1000 }}>
      <div className="relative h-40 w-full max-w-[220px]">
        <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: P.card, border: `1px solid ${P.bdr}`, transform: "rotate(4deg) translate(4px,4px)", opacity: 0.5 }} />
        <div className="relative h-full w-full cursor-pointer" onClick={() => setFlip(!flip)}>
          <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d", transition: "transform 0.7s cubic-bezier(.4,.2,.2,1)", transform: flip ? "rotateY(180deg)" : "rotateY(0)" }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border p-4 text-center" style={{ backfaceVisibility: "hidden", backgroundColor: P.card, borderColor: P.bdr }}>
              <span className="mb-2 inline-block rounded-full px-2 py-0.5 text-[8px]" style={{ fontFamily: F.mono, backgroundColor: `${P.marker}60`, color: P.ink }}>CONCEPTO CLAVE</span>
              <p className="text-xs leading-relaxed" style={{ fontFamily: F.fra, color: P.ink }}>¿Qué función cumple la mitocondria?</p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border p-4 text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", backgroundColor: P.ink, borderColor: P.ink }}>
              <p className="text-xs leading-relaxed" style={{ color: P.card, fontFamily: F.fra }}>Produce la energía (ATP) que la célula necesita para funcionar.</p>
              <div className="mt-3 flex items-center gap-1"><Check className="h-2.5 w-2.5" style={{ color: P.marker }} /><span className="text-[8px]" style={{ fontFamily: F.mono, color: P.marker }}>AGREGADA A TU MAZO</span></div>
            </div>
          </div>
        </div>
      </div>
      <span className="text-[8px]" style={{ fontFamily: F.mono, color: P.soft }}>TOCÁ LA TARJETA</span>
    </div>
  );
}

function MindmapDemo() {
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setProg((p) => (p >= 1 ? 0 : Math.min(1, p + 0.06))), 100);
    return () => clearInterval(t);
  }, []);
  const nodes = [
    { cx: 130, cy: 18, r: 16, label: "Célula" },
    { cx: 60, cy: 65, r: 12, label: "Núcleo" },
    { cx: 200, cy: 65, r: 12, label: "Mitocondria" },
    { cx: 95, cy: 115, r: 9, label: "ADN" },
    { cx: 165, cy: 115, r: 9, label: "ATP" },
  ];
  const edges = [[0, 1], [0, 2], [1, 3], [2, 4]];
  return (
    <div className="flex justify-center py-2">
      <svg viewBox="0 0 260 140" className="w-full max-w-xs">
        {edges.map(([f, t], i) => (
          <line key={i} x1={nodes[f].cx} y1={nodes[f].cy + nodes[f].r} x2={nodes[t].cx} y2={nodes[t].cy - nodes[t].r}
            stroke={P.moss} strokeWidth="1" strokeOpacity={prog > 0.15 + i * 0.12 ? 0.5 : 0}
            style={{ transition: "stroke-opacity 0.3s ease" }} />
        ))}
        {nodes.map((n, i) => {
          const vis = prog > i * 0.12;
          return (
            <g key={i} style={{ transition: "opacity 0.4s ease" }} opacity={vis ? 1 : 0}>
              <circle cx={n.cx} cy={n.cy} r={n.r} fill={P.card} stroke={i === 0 ? P.ink : P.bdr} strokeWidth={i === 0 ? 1.4 : 1} />
              <text x={n.cx} y={n.cy + 3} textAnchor="middle" fontSize={i === 0 ? 8 : 6.5} fill={P.ink} fontFamily="var(--font-space-mono)">{n.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChatDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s >= 2 ? 0 : s + 1)), 2800);
    return () => clearInterval(t);
  }, []);
  const msgs = [
    { role: "user" as const, text: "¿Por qué la mitocondria tiene su propio ADN?" },
    { role: "bot" as const, text: "Porque según la teoría endosimbiótica, fueron organismos independientes 'adoptados' por las células eucariotas." },
    { role: "user" as const, text: "¿Eso aplica también a los cloroplastos?" },
  ];
  return (
    <div className="flex justify-center py-2">
      <div className="w-full max-w-xs rounded-lg border p-3" style={{ borderColor: P.bdr, backgroundColor: P.card }}>
        <div className="mb-2 flex items-center gap-2 border-b pb-1.5" style={{ borderColor: P.bdrS }}>
          <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: P.moss }}>
            <span className="text-[7px] text-white" style={{ fontFamily: F.mono }}>S</span>
          </div>
          <span className="text-[10px] font-medium" style={{ color: P.ink }}>Stude</span>
          <span className="ml-auto text-[7px]" style={{ color: P.soft }}>CONTEXTO: Biología</span>
        </div>
        <div className="space-y-2">
          {msgs.slice(0, step + 1).map((m, i) => (
            <div key={i} className="flex gap-1.5 animate-fade-in-up">
              {m.role === "bot" && <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: P.moss }}><span className="text-[6px] text-white">S</span></div>}
              <div className={`rounded-md px-2.5 py-1.5 text-[10px] leading-relaxed max-w-[85%] ${m.role === "user" ? "ml-auto rounded-br-sm" : "rounded-bl-sm"}`}
                style={{ backgroundColor: m.role === "user" ? `${P.marker}40` : P.bg, border: `1px solid ${P.bdrS}`, color: P.ink }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DEMOS = [WaveformDemo, SummaryDemo, FlashcardDemo, MindmapDemo, QuizDemo, ChatDemo];

/* ═══════════════════════════════════════════════════════════════════════
   QUIZ DEMO (for demo tabs)
   ═══════════════════════════════════════════════════════════════════════ */

function QuizDemo() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => { setSelected(null); setStep((s) => (s >= 2 ? 0 : s + 1)); }, 3000);
    return () => clearTimeout(t);
  }, [step]);
  const qs = [
    { q: "¿Cuál organela produce la energía de la célula?", opts: ["Núcleo", "Mitocondria", "Ribosoma"], correct: 1 },
    { q: "¿Qué molécula almacena la información genética?", opts: ["ATP", "ARN", "ADN"], correct: 2 },
    { q: "¿Qué regula el intercambio de la célula?", opts: ["Mitocondria", "Ribosoma", "Membrana"], correct: 2 },
  ];
  const cur = qs[step];
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="rounded-lg border p-4" style={{ borderColor: P.bdr, backgroundColor: P.card }}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[8px] tracking-wider" style={{ fontFamily: F.mono, color: P.soft }}>PREGUNTA {step + 1}/3</span>
          <div className="ml-auto flex gap-1">{qs.map((_, i) => <span key={i} className="h-1 w-4 rounded-full" style={{ backgroundColor: i === step ? P.moss : P.bdr }} />)}</div>
        </div>
        <p className="mb-3 text-sm font-medium leading-relaxed" style={{ fontFamily: F.fra, color: P.ink }}>{cur.q}</p>
        <div className="space-y-1.5">
          {cur.opts.map((o, i) => {
            const isSelected = selected === i;
            const isCorrect = i === cur.correct && selected !== null;
            const isWrong = isSelected && i !== cur.correct;
            return (
              <button key={i} onClick={() => selected === null && setSelected(i)} className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-all duration-200"
                style={{
                  borderColor: isCorrect ? P.moss : isWrong ? P.crimson : P.bdrS,
                  backgroundColor: isCorrect ? `${P.moss}10` : isWrong ? `${P.crimson}10` : P.bg,
                  color: P.ink,
                  cursor: selected === null ? "pointer" : "default",
                }}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[8px]"
                  style={{ borderColor: isCorrect ? P.moss : isWrong ? P.crimson : P.bdr, backgroundColor: isCorrect ? P.moss : "transparent", color: isCorrect ? P.card : P.soft }}>
                  {isCorrect ? <Check className="h-2.5 w-2.5" /> : String.fromCharCode(65 + i)}
                </span>
                {o}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   RING SECTION (the key piece)
   ═══════════════════════════════════════════════════════════════════════ */

function RingSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rafRef = useRef(0);
  const lastY = useRef(0);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        if (Math.abs(p - lastY.current) > 0.001) {
          lastY.current = p;
          setProgress(p);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [reducedMotion]);

  /* Active tool index based on beats */
  const activeTool = Math.min(4, Math.max(0, Math.floor((progress - 0.12) / 0.16)));
  const showAll = progress >= 0.9;
  const showIntro = progress < 0.12;
  const isActive = (i: number) => progress >= BEATS[i + 1] && progress < BEATS[i + 2];

  const N = isMobile ? RING_SLATS_MOBILE : RING_SLATS_DESKTOP;
  const radius = isMobile ? RING_RADIUS_MOBILE : RING_RADIUS_DESKTOP;
  const rotY = progress * -260;
  const scale = 0.65 + progress * 0.4;

  const ActiveDemo = DEMOS[activeTool];

  /* ── Reduced motion fallback: static grid ── */
  if (reducedMotion) {
    return (
      <section className="py-16" style={{ backgroundColor: P.ringBg }}>
        <SectionHead eyebrow="TODO SALE DE LA MISMA GRABACIÓN">
          <span style={{ color: P.card }}>Cinco herramientas, una grabación</span>
        </SectionHead>
        <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 sm:px-6">
          {TOOLS.map((t) => (
            <div key={t.id} className="rounded-xl border p-5" style={{ borderColor: `${P.card}30`, backgroundColor: P.card }}>
              <span className="mb-2 block text-[9px] tracking-widest" style={{ fontFamily: F.mono, color: P.moss }}>{t.tag}</span>
              <h3 className="text-base font-medium" style={{ fontFamily: F.fra, color: P.ink }}>{t.title}</h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: P.soft }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="ring-section">
      <div className="ring-sticky" style={{ backgroundColor: P.ringBg }}>

        {/* ── Left: Ring ── */}
        <div className="ring-scene" style={{ perspective: isMobile ? 800 : 1200 }}>
          <div className="ring-container" style={{ width: radius * 2 + 60, height: radius * 2 + 60, transform: `scale(${scale}) rotateY(${rotY}deg)` }}>
            {/* Slats */}
            {Array.from({ length: N }).map((_, i) => {
              const angle = (360 / N) * i;
              return (
                <div key={i} className="ring-slat" style={{
                  backgroundColor: i % 5 === activeTool ? P.marker : `${P.card}90`,
                  boxShadow: i % 5 === activeTool ? `0 0 8px ${P.marker}60` : "none",
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                  transition: "background-color 0.4s ease, box-shadow 0.4s ease",
                }} />
              );
            })}
            {/* Orb */}
            <div className="ring-orb" style={{
              background: `radial-gradient(circle, ${P.marker}40 0%, ${P.marker}10 60%, transparent 100%)`,
              boxShadow: `0 0 ${isMobile ? 30 : 60}px ${P.marker}30`,
            }} />
          </div>

          {/* ── Scroll hint ── */}
          {showIntro && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
              <span className="text-[9px] tracking-[0.2em]" style={{ fontFamily: F.mono, color: `${P.card}90` }}>SCROLLEÁ</span>
              <ChevronDown className="h-3 w-3" style={{ color: `${P.card}90` }} />
            </div>
          )}
        </div>

        {/* ── Right: Active Panel ── */}
        <div className="absolute right-0 top-0 hidden h-full w-[45%] items-center justify-center pr-8 lg:flex">
          <div className="w-full max-w-md" style={{ opacity: showAll ? 0 : showIntro ? 0.3 : 1, transition: "opacity 0.5s ease" }}>
            {!showIntro && (
              <div key={activeTool} className="animate-fade-in-up">
                {/* Number */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-sm text-sm font-bold" style={{ fontFamily: F.mono, backgroundColor: P.ink, color: P.card }}>
                    {TOOLS[activeTool].num}
                  </span>
                  <span className="text-[10px] tracking-[0.15em]" style={{ fontFamily: F.mono, color: `${P.card}80` }}>
                    {TOOLS[activeTool].num} / 05
                  </span>
                </div>
                {/* Title + desc */}
                <h3 className="mb-2 text-2xl font-medium" style={{ fontFamily: F.fra, color: P.card }}>
                  {TOOLS[activeTool].title}
                </h3>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: `${P.card}B0` }}>
                  {TOOLS[activeTool].desc}
                </p>
                {/* Demo */}
                <div className="rounded-xl border p-5" style={{ borderColor: `${P.card}20`, backgroundColor: `${P.card}10`, backdropFilter: "blur(8px)" }}>
                  <ActiveDemo />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile: compact panel below ring ── */}
        {isMobile && !showIntro && !showAll && (
          <div className="absolute bottom-16 left-0 right-0 px-4">
            <div key={activeTool} className="animate-fade-in-up mx-auto max-w-xs rounded-xl border p-4" style={{ borderColor: `${P.card}20`, backgroundColor: `${P.card}15`, backdropFilter: "blur(8px)" }}>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-sm text-xs font-bold" style={{ fontFamily: F.mono, backgroundColor: P.ink, color: P.card }}>{TOOLS[activeTool].num}</span>
                <div>
                  <span className="text-[8px] tracking-[0.12em] block" style={{ fontFamily: F.mono, color: `${P.card}80` }}>{TOOLS[activeTool].num} / 05</span>
                  <h3 className="text-sm font-medium" style={{ fontFamily: F.fra, color: P.card }}>{TOOLS[activeTool].title}</h3>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed mb-3" style={{ color: `${P.card}B0` }}>{TOOLS[activeTool].desc}</p>
              <div className="rounded-lg border p-3" style={{ borderColor: `${P.card}15`, backgroundColor: `${P.card}08` }}>
                <ActiveDemo />
              </div>
            </div>
          </div>
        )}

        {/* ── Bottom labels ── */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 sm:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            {TOOLS.map((t, i) => {
              const active = showAll || isActive(i);
              return (
                <div key={t.id} className="flex flex-col items-center gap-1 transition-all duration-500" style={{ opacity: active ? 1 : 0.35, transform: active ? "translateY(0)" : "translateY(4px)" }}>
                  <span className="text-[8px] tracking-wider" style={{ fontFamily: F.mono, color: `${P.card}80` }}>{t.num} / 05</span>
                  <span className="text-[9px] font-medium tracking-[0.1em]" style={{ fontFamily: F.mono, color: active ? P.card : `${P.card}70` }}>{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   IO HOOK
   ═══════════════════════════════════════════════════════════════════════ */

function useInView(threshold = 0.2) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════════════════ */

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done.current) return;
      done.current = true;
      obs.unobserve(el);
      let cur = 0;
      const step = Math.max(1, Math.ceil(target / 50));
      const iv = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(iv); } setVal(cur); }, 20);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  /* ── Nav solid + progress bar ── */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const top = window.scrollY || 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (top / total) * 100 : 0;
      if (progressRef.current) progressRef.current.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  /* ── Paper theme ── */
  useEffect(() => {
    document.documentElement.classList.add("paper-theme");
    return () => document.documentElement.classList.remove("paper-theme");
  }, []);

  /* ── Scroll reset ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  /* ── Anchor clicks with offset ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: "smooth" });
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: P.bg }}>
      <Grain />
      <div ref={progressRef} id="scrollProgress" aria-hidden="true" />

      {/* ═══ NAV ═══ */}
      <nav className="fixed left-0 right-0 top-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? `${P.bg}E0` : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? `1px solid ${P.bdr}` : "1px solid transparent",
        }}>
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-lg font-semibold italic tracking-tight" style={{ fontFamily: F.fra, fontWeight: 600, color: P.ink }}>Studere</span>
            <Squiggly />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 hover:opacity-70"
              style={{ fontFamily: F.mono, color: P.soft, letterSpacing: "0.04em", fontSize: 12 }}>
              Iniciar sesión
            </Link>
            <Link href="/sign-up" className="rounded-lg px-5 py-2 text-xs font-semibold transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md"
              style={{ fontFamily: F.sans, backgroundColor: P.ink, color: P.card, fontSize: 12, boxShadow: scrolled ? "2px 2px 0 rgba(30,39,51,0.2)" : "none" }}>
              Empezar
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative z-10 mx-auto max-w-5xl px-4 pb-8 pt-28 sm:px-6 sm:pt-36">
        <div className="mb-10 text-center">
          <div className="hero-line mx-auto mb-6 inline-flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: P.crimson }} />
            <span className="text-[10px] tracking-[0.15em]" style={{ fontFamily: F.mono, color: P.soft }}>AUDIO → APUNTES → REPASO</span>
          </div>

          <h1 className="hero-line mx-auto max-w-3xl text-balance px-2 text-[clamp(36px,5vw,56px)] leading-[1.08] font-medium -tracking-[0.01em]"
            style={{ fontFamily: F.fra, color: P.ink }}>
            Grabá la clase.<br />
            Nosotros hacemos{" "}
            <span className="relative whitespace-nowrap italic font-semibold">
              <span className="absolute -left-1 -right-1 bottom-[0.08em] z-[-1] skew-[-8deg] -rotate-[1deg] opacity-90" style={{ height: "0.48em", backgroundColor: P.marker }} />
              los apuntes
            </span>.
          </h1>

          <p className="hero-line mx-auto mt-5 max-w-lg text-balance text-base leading-relaxed" style={{ color: P.soft }}>
            Subí la grabación y en minutos tenés transcripción, flashcards, mapas mentales y quizzes — listos para repasar antes del parcial.
          </p>

          <div className="hero-line mt-8 flex items-center justify-center gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-sm px-7 py-3 text-sm font-semibold transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-lg"
              style={{ backgroundColor: P.ink, color: P.card, border: `1.5px solid ${P.ink}`, boxShadow: "3px 3px 0 rgba(30,39,51,0.2)" }}>
              Empezar <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#demo-tabs" className="inline-flex items-center gap-1.5 rounded-sm border px-6 py-3 text-sm font-medium transition-all duration-200 hover:border-current"
              style={{ fontFamily: F.sans, color: P.ink, borderColor: P.bdr }}>
              Ver cómo funciona <ChevronDown className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="hero-line mt-6 flex items-center justify-center gap-4 text-[11px] tracking-wide" style={{ fontFamily: F.mono, color: P.soft }}>
            <span>120+ HRS TRANSCRITAS</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">5,000+ FLASHCARDS</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">99% PRECISIÓN</span>
          </div>
        </div>

        {/* Hero flip card */}
        <div className="hero-card relative mx-auto mb-6 max-w-lg">
          <div className="absolute -inset-x-2 -top-2 bottom-2 rounded-xl border" style={{ backgroundColor: P.card, borderColor: P.bdr, transform: "rotate(-3deg)" }} />
          <div className="absolute -inset-x-1 bottom-1 top-1 rounded-xl border" style={{ backgroundColor: P.card, borderColor: P.bdrS, transform: "rotate(2deg)" }} />
          <div className="relative rounded-xl border p-6" style={{ backgroundColor: P.card, borderColor: P.bdr }}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex-1">
                <span className="mb-3 block text-[10px] tracking-[0.15em]" style={{ fontFamily: F.mono, color: P.soft }}>CLASE GRABADA</span>
                <div className="flex items-end gap-1" style={{ height: 60 }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="flex-1 animate-pulse rounded-t-sm" style={{
                      height: `${Math.max(8, 20 + Math.sin(i * 0.9) * 30 + 10)}%`,
                      backgroundColor: i % 3 === 0 ? P.moss : i % 3 === 1 ? P.ink : P.soft,
                      animationDelay: `${i * 0.06}s`, animationDuration: "1s",
                    }} />
                  ))}
                </div>
                <span className="mt-2 block text-[11px]" style={{ fontFamily: F.mono, color: P.soft }}>Biología celular — 18:42</span>
              </div>
              <div className="hidden w-px self-stretch sm:block" style={{ backgroundColor: P.bdrS }} />
              <div className="flex-1 text-center">
                <span className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[9px] tracking-wider" style={{ fontFamily: F.mono, backgroundColor: `${P.marker}70`, color: P.ink }}>FLASHCARD GENERADA</span>
                <p className="text-sm leading-relaxed" style={{ fontFamily: F.fra, color: P.ink }}>
                  ¿Qué función cumple la <span className="font-semibold italic">mitocondria</span>?
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[9px]" style={{ fontFamily: F.mono, color: P.moss, backgroundColor: `${P.moss}10` }}>
                  <Check className="h-2.5 w-2.5" /> AGREGADA A TU MAZO
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex animate-bounce items-center justify-center gap-1.5 pt-2">
          <span className="text-[9px] tracking-[0.2em]" style={{ fontFamily: F.mono, color: `${P.soft}80` }}>DESCUBRÍ MÁS</span>
          <ChevronDown className="h-3 w-3" style={{ color: `${P.soft}80` }} />
        </div>
      </section>

      {/* ═══ DEMO TABS ═══ */}
      <DemoTabs />

      {/* ═══ INPUTS ═══ */}
      <InputsSection />

      {/* ═══ RING SECTION ═══ */}
      <RingSection />

      {/* ═══ STATS ═══ */}
      <StatsSection />

      {/* ═══ TESTIMONIALS ═══ */}
      <TestimonialsSection />

      {/* ═══ CTA ═══ */}
      <CTASection />

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t px-4 py-8" style={{ borderColor: P.bdrS }}>
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 text-[11px] sm:flex-row" style={{ color: P.soft }}>
          <span className="text-sm font-semibold italic" style={{ fontFamily: F.fra, color: P.ink }}>Studere</span>
          <span style={{ fontFamily: F.mono, fontSize: 10 }}>TU COPILOTO DE ESTUDIO — 2026</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DEMO TABS (below hero)
   ═══════════════════════════════════════════════════════════════════════ */

function DemoTabs() {
  const [tab, setTab] = useState(0);
  const labels = ["Resumen", "Flashcards", "Mapa mental", "Quiz"];
  /* Map tab index to correct demo: Resumen→Summary, Flashcards→Flashcard, Mapa→Mindmap, Quiz→Quiz */
  const TAB_DEMO_MAP = [1, 2, 3, 4];
  const Demo = DEMOS[TAB_DEMO_MAP[tab]];

  return (
    <section id="demo-tabs" className="relative z-10 pb-16 pt-8">
      <SectionHead eyebrow="EN VIVO">Una grabación, cuatro materiales</SectionHead>
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-0 flex gap-1" role="tablist">
          {labels.map((l, i) => (
            <button key={i} role="tab" aria-selected={tab === i}
              onClick={() => setTab(i)}
              className="rounded-t-lg border border-b-0 px-4 py-2.5 text-[11px] transition-all duration-200"
              style={{
                fontFamily: F.mono, letterSpacing: "0.03em",
                borderColor: tab === i ? P.bdr : P.bdrS,
                backgroundColor: tab === i ? P.card : "transparent",
                color: tab === i ? P.ink : P.soft,
                fontWeight: tab === i ? 700 : 400,
              }}>
              {l}
            </button>
          ))}
        </div>
        <div className="rounded-b-xl rounded-tr-xl border p-6 sm:p-8" style={{ borderColor: P.bdr, backgroundColor: P.card, minHeight: 260 }}>
          <div key={tab} className="animate-fade-in">
            <Demo />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   INPUTS SECTION
   ═══════════════════════════════════════════════════════════════════════ */

function InputsSection() {
  const { ref, visible } = useInView(0.2);
  return (
    <section className="relative z-10 pb-16 pt-4">
      <SectionHead eyebrow="LO QUE LE PODÉS SUBIR">Grabación, video, apuntes o una foto del pizarrón</SectionHead>
      <div ref={ref} className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-4 sm:gap-4 sm:grid-cols-4 sm:px-6">
        {INPUTS_DATA.map((f, i) => (
          <div key={i} className="rounded-xl border p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-md"
            style={{
              borderColor: visible ? P.bdr : P.bdrS, backgroundColor: P.card,
              transform: visible ? `rotate(${f.rotate}) translateY(0)` : `rotate(${f.rotate}) translateY(16px)`,
              opacity: visible ? 1 : 0, transitionDelay: `${i * 80}ms`,
            }}>
            <f.icon className="mb-3 h-5 w-5" style={{ color: P.ink }} />
            <h4 className="text-sm font-medium" style={{ fontFamily: F.fra, color: P.ink }}>{f.title}</h4>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: P.soft }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STATS
   ═══════════════════════════════════════════════════════════════════════ */

function StatsSection() {
  const stats = [
    { target: 120, suffix: "+", label: "HORAS TRANSCRITAS" },
    { target: 5000, suffix: "+", label: "FLASHCARDS GENERADAS" },
    { target: 99, suffix: "%", label: "PRECISIÓN" },
    { target: 5, suffix: "", label: "HERRAMIENTAS" },
  ];
  return (
    <section className="relative z-10 pb-16">
      <div className="mx-auto grid max-w-4xl grid-cols-2 border-y sm:grid-cols-4" style={{ borderColor: P.bdr }}>
        {stats.map((s, i) => (
          <div key={i} className="px-4 py-8 text-center sm:py-10" style={{ borderRight: i < 3 ? `1px solid ${P.bdr}` : "none" }}>
            <span className="block text-3xl font-bold sm:text-4xl" style={{ fontFamily: F.fra, color: P.ink }}>
              <Counter target={s.target} suffix={s.suffix} />
            </span>
            <span className="mt-1 block text-[9px] tracking-[0.15em]" style={{ fontFamily: F.mono, color: P.soft }}>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════════════════════════ */

function TestimonialsSection() {
  const { ref, visible } = useInView(0.25);
  return (
    <section className="relative z-10 pb-16">
      <SectionHead eyebrow="ALUMNOS">Lo que dicen los que ya la usan</SectionHead>
      <div ref={ref} className="mx-auto grid max-w-3xl gap-6 px-4 sm:grid-cols-2 sm:px-6">
        {TESTIMONIALS.map((t, i) => (
          <div key={i} className="rounded-sm p-5 shadow-lg" style={{
            backgroundColor: P.marker,
            transform: visible ? `rotate(${t.rotate})` : `rotate(${t.rotate}) translateY(20px)`,
            opacity: visible ? 1 : 0,
            transition: `opacity 0.6s ease ${i * 150}ms, transform 0.6s ease ${i * 150}ms`,
            boxShadow: `0 8px 20px ${P.sh}`,
          }}>
            <p className="mb-4 text-sm leading-relaxed" style={{ fontFamily: F.fra, color: P.ink, fontStyle: "italic" }}>
              &ldquo;{t.text}&rdquo;
            </p>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-3 w-3" style={{ fill: P.ink, color: P.ink }} />)}
            </div>
            <div className="mt-2 text-[10px]" style={{ fontFamily: F.mono, color: `${P.ink}99` }}>{t.author} — {t.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CTA
   ═══════════════════════════════════════════════════════════════════════ */

function CTASection() {
  return (
    <section className="relative z-10 mx-auto max-w-4xl px-4 pb-16 sm:px-6">
      <div className="relative overflow-hidden rounded-xl px-8 py-12 text-center sm:px-14 sm:py-16" style={{ backgroundColor: P.ink, border: `2px dashed ${P.card}40` }}>
        <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full opacity-20" style={{ backgroundColor: P.marker, filter: "blur(80px)" }} />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full opacity-15" style={{ backgroundColor: P.moss, filter: "blur(80px)" }} />
        <div className="relative z-10">
          <h2 className="text-2xl font-medium sm:text-3xl" style={{ fontFamily: F.fra, color: P.card }}>Empezá a estudiar distinto</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: `${P.card}B0` }}>
            Convertí tu próxima clase en material de estudio en minutos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-sm px-8 py-3.5 text-sm font-semibold transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{ backgroundColor: P.marker, color: P.ink, border: `1.5px solid ${P.marker}`, boxShadow: "3px 3px 0 rgba(243,238,223,0.3)" }}>
              Probar Studere <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/sign-in" className="inline-flex items-center gap-1.5 rounded-sm border px-6 py-3.5 text-sm font-medium transition-all duration-200 hover:opacity-80"
              style={{ fontFamily: F.sans, color: P.card, borderColor: `${P.card}40` }}>
              Ya tengo cuenta <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px]" style={{ color: `${P.card}80` }}>
            <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" style={{ color: P.marker }} /> Tus datos seguros</span>
          </div>
        </div>
      </div>
    </section>
  );
}

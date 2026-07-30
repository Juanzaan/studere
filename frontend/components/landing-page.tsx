"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, ChevronDown, Star, Check, Mic, Camera, FileText, Monitor } from "lucide-react";

// ─── Paper Color Palette ────────────────────────────────────────────────

const PAPER = {
  bg: "#C9B99A",
  card: "#D8C9AD",
  ink: "#2C1810",
  inkSoft: "#7A6B55",
  marker: "#D4A852",
  moss: "#5C7A4A",
  crimson: "#8B3A3A",
  border: "rgba(44,24,16,0.18)",
  borderSoft: "rgba(44,24,16,0.10)",
  shadow: "rgba(44, 24, 16, 0.12)",
};

// ─── Grain Background ───────────────────────────────────────────────────

function GrainBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${PAPER.ink}08 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

// ─── Animated Squiggly Logo ─────────────────────────────────────────────

function AnimatedSquiggly() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    path.style.transition = "stroke-dashoffset 1.8s cubic-bezier(0.65, 0, 0.35, 1)";
    const raf = requestAnimationFrame(() => {
      path.style.strokeDashoffset = "0";
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg width="70" height="10" viewBox="0 0 70 10" className="ml-1 -translate-y-0.5">
      <path
        ref={pathRef}
        d="M2 7 Q 18 1, 35 6 T 68 4"
        stroke={PAPER.ink}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Chapter Data ───────────────────────────────────────────────────────

const CHAPTERS = [
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

// ─── Small interactive demos for each chapter ───────────────────────────

function WaveformDemo() {
  const [phase, setPhase] = useState(0);
  const bars = 16;

  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % 20), 200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4">
      {/* Waveform */}
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {Array.from({ length: bars }).map((_, i) => {
          const h = 20 + Math.sin(i * 0.8 + phase * 0.3) * 18 + Math.sin(i * 1.7 + phase * 0.5) * 12 + 14;
          return (
            <div
              key={i}
              className="w-2 rounded-t-sm transition-all duration-150"
              style={{
                height: `${Math.max(4, h)}%`,
                backgroundColor: i % 4 === 0 ? PAPER.moss : i % 4 === 2 ? PAPER.ink : PAPER.inkSoft,
                opacity: 0.5 + (i + phase) % bars / bars * 0.5,
              }}
            />
          );
        })}
      </div>
      {/* Transcription text */}
      <div className="w-full space-y-2 rounded-xl border p-4" style={{ borderColor: PAPER.border, backgroundColor: PAPER.card }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PAPER.crimson }} />
          <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: PAPER.inkSoft }}>GRABANDO</span>
          <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: PAPER.inkSoft }}>18:42</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: PAPER.ink }}>
          <span className="opacity-40">La célula es la unidad fundamental de todo ser vivo...</span>{" "}
          <span className="opacity-70">Existen dos tipos principales: procariotas y eucariotas.</span>{" "}
          <span style={{ backgroundColor: PAPER.marker, color: PAPER.ink }} className="px-0.5">
            Las eucariotas tienen núcleo definido
          </span>
          <span className="opacity-100"> y organelas como las mitocondrias.</span>
        </p>
      </div>
    </div>
  );
}

function SummaryDemo() {
  const [visibleBullets, setVisibleBullets] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleBullets((p) => (p >= 4 ? 0 : p + 1));
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const bullets = [
    { text: "La mitocondria produce energía (ATP)", highlight: true },
    { text: "El núcleo guarda el ADN celular", highlight: false },
    { text: "La membrana regula el intercambio", highlight: false },
    { text: "Los ribosomas sintetizan proteínas", highlight: false },
  ];

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div
        className="w-full rounded-xl border p-5"
        style={{ borderColor: PAPER.border, backgroundColor: PAPER.card }}
      >
        <h3 className="mb-3 text-base font-medium" style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}>
          Biología celular — resumen
        </h3>
        {/* Skeleton lines */}
        <div className="mb-4 space-y-2">
          <div className="h-2.5 rounded" style={{ width: "94%", backgroundColor: PAPER.border }} />
          <div className="h-2.5 rounded" style={{ width: "87%", backgroundColor: PAPER.border }} />
          <div className="h-2.5 rounded" style={{ width: "62%", backgroundColor: PAPER.border }} />
        </div>
        {/* Bullets */}
        <ul className="space-y-2.5">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm transition-all duration-500"
              style={{
                opacity: i <= visibleBullets ? 1 : 0,
                transform: i <= visibleBullets ? "translateY(0)" : "translateY(8px)",
                color: PAPER.ink,
              }}
            >
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: PAPER.moss }}
              />
              {b.highlight ? (
                <span className="px-0.5" style={{ backgroundColor: PAPER.marker }}>
                  {b.text}
                </span>
              ) : (
                <span style={{ color: PAPER.inkSoft }}>{b.text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FlashcardDemo() {
  const [flipped, setFlipped] = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);

  // Auto-flip cycle
  useEffect(() => {
    const t1 = setTimeout(() => setAutoFlip(true), 2000);
    const t2 = setTimeout(() => setAutoFlip(false), 5000);
    const cycle = setInterval(() => {
      setAutoFlip((p) => !p);
    }, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(cycle);
    };
  }, []);

  const isFlipped = autoFlip;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Stack shadow cards */}
      <div className="relative h-52 w-full max-w-xs" style={{ perspective: "1000px" }}>
        <div
          className="absolute inset-0 rounded-xl opacity-60"
          style={{ backgroundColor: PAPER.card, border: `1px solid ${PAPER.border}`, transform: "rotate(4deg) translate(6px, 6px)" }}
        />
        <div
          className="absolute inset-0 rounded-xl opacity-80"
          style={{ backgroundColor: PAPER.card, border: `1px solid ${PAPER.borderSoft}`, transform: "rotate(-3deg) translate(-4px, 4px)" }}
        />
        {/* Flip card */}
        <div
          className="relative h-full w-full cursor-pointer"
          style={{ perspective: "1000px" }}
          onClick={() => setFlipped(!flipped)}
        >
          <div
            className="relative h-full w-full transition-all duration-700"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped || flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border p-6 text-center"
              style={{
                backfaceVisibility: "hidden",
                backgroundColor: PAPER.card,
                borderColor: PAPER.border,
              }}
            >
              <span
                className="mb-3 inline-block rounded-full px-3 py-0.5 text-[10px]"
                style={{ fontFamily: "var(--font-space-mono)", backgroundColor: `${PAPER.marker}60`, color: PAPER.ink }}
              >
                CONCEPTO CLAVE
              </span>
              <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}>
                ¿Qué función cumple la mitocondria?
              </p>
            </div>
            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border p-6 text-center"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                backgroundColor: PAPER.ink,
                borderColor: PAPER.ink,
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: PAPER.card, fontFamily: "var(--font-fraunces)" }}>
                Produce la energía (ATP) que la célula necesita para funcionar.
              </p>
              <div className="mt-4 flex items-center gap-1.5">
                <Check className="h-3 w-3" style={{ color: PAPER.marker }} />
                <span className="text-[10px]" style={{ fontFamily: "var(--font-space-mono)", color: PAPER.marker }}>
                  AGREGADA A TU MAZO
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className="text-[10px]" style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}>
        FICHA 3 / 24 · TOCÁ LA TARJETA
      </span>
    </div>
  );
}

function MindmapDemo() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => (p >= 1 ? 0 : Math.min(1, p + 0.08)));
    }, 120);
    return () => clearInterval(timer);
  }, []);

  // Each node fades in based on progress
  const nodes = [
    { cx: 160, cy: 20, r: 18, label: "Célula", size: "large" },
    { cx: 80, cy: 75, r: 14, label: "Núcleo", size: "medium" },
    { cx: 240, cy: 75, r: 14, label: "Mitocondria", size: "medium" },
    { cx: 120, cy: 130, r: 11, label: "ADN", size: "small" },
    { cx: 200, cy: 130, r: 11, label: "ATP", size: "small" },
  ];

  const edges = [
    [0, 1], [0, 2], [1, 3], [2, 4],
  ];

  return (
    <div className="flex flex-col items-center py-4">
      <svg viewBox="0 0 320 170" className="h-full w-full max-w-sm">
        {/* Edges */}
        {edges.map(([from, to], i) => {
          const visible = progress > 0.15 + i * 0.12;
          return (
            <line
              key={i}
              x1={nodes[from].cx}
              y1={nodes[from].cy + nodes[from].r}
              x2={nodes[to].cx}
              y2={nodes[to].cy - nodes[to].r}
              stroke={PAPER.moss}
              strokeWidth="1.2"
              strokeOpacity={visible ? 0.5 : 0}
              style={{ transition: "stroke-opacity 0.4s ease" }}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((n, i) => {
          const visible = progress > i * 0.12;
          return (
            <g
              key={i}
              style={{ transition: "opacity 0.5s ease, transform 0.5s ease" }}
              opacity={visible ? 1 : 0}
              transform={visible ? "translate(0,0)" : "translate(0,-8)"}
            >
              <circle
                cx={n.cx}
                cy={n.cy}
                r={n.r}
                fill={PAPER.card}
                stroke={i === 0 ? PAPER.ink : PAPER.border}
                strokeWidth={i === 0 ? 1.6 : 1.2}
              />
              <text
                x={n.cx}
                y={n.cy + 3}
                textAnchor="middle"
                fontSize={n.size === "large" ? 9 : n.size === "medium" ? 7 : 6}
                fill={PAPER.ink}
                fontFamily="var(--font-space-mono)"
              >
                {n.label}
              </text>
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
    const timer = setInterval(() => {
      setStep((p) => (p >= 3 ? 0 : p + 1));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const messages = [
    { role: "user", text: "¿Por qué la mitocondria tiene su propio ADN?" },
    { role: "bot", text: "Porque según la teoría endosimbiótica, las mitocondrias fueron organismos independientes que fueron 'adoptados' por las células eucariotas. Por eso conservan su propio ADN circular, similar al de las bacterias." },
    { role: "user", text: "¿Eso aplica también a los cloroplastos?" },
  ];

  return (
    <div className="flex flex-col items-center py-2">
      <div
        className="w-full max-w-sm rounded-xl border p-4"
        style={{ borderColor: PAPER.border, backgroundColor: PAPER.card }}
      >
        <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderColor: PAPER.borderSoft }}>
          <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: PAPER.moss }}>
            <span className="text-[9px] text-white" style={{ fontFamily: "var(--font-space-mono)" }}>S</span>
          </div>
          <span className="text-xs font-medium" style={{ color: PAPER.ink }}>Stude</span>
          <span className="ml-auto text-[9px]" style={{ color: PAPER.inkSoft }}>CONTEXTO: Biología celular</span>
        </div>

        <div className="space-y-3">
          {messages.slice(0, step + 1).map((msg, i) => (
            <div key={i} className="flex gap-2 animate-fade-in-up">
              {msg.role === "bot" && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: PAPER.moss }}>
                  <span className="text-[7px] text-white">S</span>
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 text-xs leading-relaxed max-w-[85%] ${
                  msg.role === "user"
                    ? "ml-auto rounded-br-sm"
                    : "rounded-bl-sm"
                }`}
                style={{
                  backgroundColor: msg.role === "user" ? `${PAPER.marker}40` : PAPER.bg,
                  border: `1px solid ${msg.role === "user" ? PAPER.borderSoft : PAPER.border}`,
                  color: PAPER.ink,
                }}
              >
                {msg.text}
                {i === step && msg.role === "bot" && step < 2 && (
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse align-text-bottom" style={{ backgroundColor: PAPER.moss }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Decorative paper elements ────────────────────────────────────

const PAPER_TONES = [
  { bg: "#D8C9AD", accent: "#5C7A4A", label: "CUADERNO" },
  { bg: "#E0D2B8", accent: "#8B3A3A", label: "FOTOCOPIAS" },
  { bg: "#C9B99A", accent: "#D4A852", label: "FICHA" },
  { bg: "#DDCEB3", accent: "#2C1810", label: "GRÁFICO" },
  { bg: "#F5E6C8", accent: "#D4A852", label: "NOTA" },
];

const DEMOS = [
  { component: WaveformDemo },
  { component: SummaryDemo },
  { component: FlashcardDemo },
  { component: MindmapDemo },
  { component: ChatDemo },
];

const CARD_ENTRY = [
  { rotateFrom: "-3deg", rotateTo: "-1.5deg", translateX: "-60px", translateY: "0px" },
  { rotateFrom: "4deg", rotateTo: "2deg", translateX: "60px", translateY: "0px" },
  { rotateFrom: "0deg", rotateTo: "0.5deg", translateX: "0px", translateY: "40px" },
  { rotateFrom: "-6deg", rotateTo: "-2deg", translateX: "-40px", translateY: "-20px" },
  { rotateFrom: "5deg", rotateTo: "1.5deg", translateX: "40px", translateY: "-30px" },
];

function ToolCard({ chapter, demo, index }: { chapter: typeof CHAPTERS[0]; demo: typeof DEMOS[0]; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const DemoComp = demo.component;
  const tone = PAPER_TONES[index];
  const entry = CARD_ENTRY[index];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-2xl px-4 sm:px-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `translate3d(0,0,0) rotate(${entry.rotateTo}) scale(1)`
          : `translate3d(${entry.translateX},${entry.translateY},0) rotate(${entry.rotateFrom}) scale(0.94)`,
        transition: `opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08}s`,
        willChange: "transform, opacity",
      }}
    >
      <div className="pointer-events-none absolute -inset-x-1 bottom-0 top-1 rounded-2xl"
        style={{
          backgroundColor: PAPER.ink,
          opacity: visible ? 0.08 : 0,
          transform: visible ? "translate(6px, 6px)" : "translate(0px, 0px)",
          transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`,
          filter: "blur(6px)",
        }}
      />

      <div className="relative overflow-hidden rounded-xl border p-6 sm:p-8"
        style={{
          borderColor: PAPER.border,
          backgroundColor: tone.bg,
          transition: `box-shadow 0.6s ease ${index * 0.08}s`,
          boxShadow: visible
            ? `0 8px 24px ${PAPER.shadow}`
            : "0 0 0 transparent",
        }}
      >
        {/* washi tape */}
        <div className="pointer-events-none absolute -left-3 -top-3 h-16 w-8 opacity-70"
          style={{
            backgroundColor: `${tone.accent}40`,
            transform: "rotate(-15deg)",
            clipPath: "polygon(0 0, 100% 10%, 100% 90%, 0 100%)",
          }}
        />

        {/* paperclip */}
        <div className="pointer-events-none absolute right-4 top-4 opacity-40"
          style={{ transform: `rotate(${index * 20}deg)` }}
        >
          <svg width="16" height="32" viewBox="0 0 16 32" fill="none">
            <path d="M4 2v24a4 4 0 0 0 8 0V6a2 2 0 0 0-4 0v18a1 1 0 0 0 2 0V8" stroke={PAPER.ink} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm text-xs font-bold"
              style={{
                fontFamily: "var(--font-space-mono)",
                backgroundColor: PAPER.ink,
                color: tone.bg,
                transform: `rotate(${index % 2 === 0 ? "-2" : "2"}deg)`,
              }}
            >
              {chapter.num}
            </span>
            <div>
              <span className="block text-[9px] tracking-[0.15em]"
                style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
              >
                {tone.label} &middot; {chapter.tag}
              </span>
              <h3 className="text-lg font-medium leading-tight sm:text-xl"
                style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
              >
                {chapter.title}
              </h3>
            </div>
          </div>

          <p className="mb-6 max-w-md text-sm leading-relaxed" style={{ color: PAPER.inkSoft }}>
            {chapter.desc}
          </p>

          <div className="relative overflow-hidden rounded-lg border p-4 sm:p-6"
            style={{ borderColor: `${tone.accent}30`, backgroundColor: PAPER.bg }}
          >
            <div className="pointer-events-none absolute -bottom-0.5 left-2 right-2 top-2 rounded-lg opacity-60"
              style={{ backgroundColor: tone.bg, border: `1px solid ${PAPER.borderSoft}` }}
            />
            <div className="relative z-10">
              <DemoComp />
            </div>
          </div>
        </div>

        {/* folded corner */}
        <div className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-6 w-6 transition-all duration-500"
          style={{
            backgroundColor: visible ? PAPER.bg : tone.bg,
            borderTop: `1px solid ${PAPER.border}`,
            borderLeft: `1px solid ${PAPER.border}`,
            opacity: visible ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

// ─── Scroll-Driven Section (unique paper cards) ────────────────────

function ScrollStorytelling() {
  return (
    <section className="relative pb-12 pt-4" id="scroll-demo">
      <div className="mx-auto mb-12 max-w-4xl px-4 text-center sm:px-6">
        <span
          className="mb-2 block text-[10px] tracking-[0.2em]"
          style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
        >
          ESPARCIDO SOBRE EL ESCRITORIO
        </span>
        <h2
          className="text-xl font-medium sm:text-2xl"
          style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
        >
          Tus herramientas, como papeles sobre la mesa
        </h2>
      </div>

      <div className="flex flex-col items-center gap-16 sm:gap-20">
        {CHAPTERS.map((ch, i) => (
          <ToolCard key={ch.id} chapter={ch} demo={DEMOS[i]} index={i} />
        ))}
      </div>
    </section>
  );
}

// ─── Feature Cards ──────────────────────────────────────────────────────

const FEATURES_DATA = [
  {
    icon: Mic,
    title: "Audio de la clase",
    desc: "Hasta 2+ horas, se transcribe por partes sin trabarse.",
    rotate: "-2deg",
  },
  {
    icon: Monitor,
    title: "Grabación de pantalla",
    desc: "Video de la clase o de tu propia sesión de estudio.",
    rotate: "1deg",
  },
  {
    icon: FileText,
    title: "Apuntes o transcript",
    desc: "Pegá texto o subí un .txt / .md, sin pasos extra.",
    rotate: "-1deg",
  },
  {
    icon: Camera,
    title: "Foto del pizarrón",
    desc: "O de un ejercicio resuelto — Stude te lo corrige.",
    rotate: "2deg",
  },
];

function InputMethods() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-4 sm:gap-4 sm:grid-cols-4 sm:px-6"
    >
      {FEATURES_DATA.map((f, i) => (
        <div
          key={i}
          className="rounded-xl border p-5 transition-all duration-500 hover:-translate-y-1"
          style={{
            borderColor: visible ? PAPER.border : PAPER.borderSoft,
            backgroundColor: PAPER.card,
            transform: visible ? `rotate(${f.rotate}) translateY(0)` : `rotate(${f.rotate}) translateY(16px)`,
            opacity: visible ? 1 : 0,
            transitionDelay: `${i * 80}ms`,
          }}
        >
          <f.icon className="mb-3 h-5 w-5" style={{ color: PAPER.ink }} />
          <h4 className="text-sm font-medium" style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}>
            {f.title}
          </h4>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: PAPER.inkSoft }}>
            {f.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Tool Features Grid ────────────────────────────────────────────────

const TOOL_FEATURES = [
  {
    tag: "TRANSCRIPCIÓN",
    title: "Texto completo, en minutos",
    desc: "Subí audio o video de hasta 2 horas y obtené la transcripción completa de la clase.",
  },
  {
    tag: "RESUMEN IA",
    title: "Lo importante, sin el ruido",
    desc: "Un resumen estructurado con los conceptos clave de la clase.",
  },
  {
    tag: "FLASHCARDS",
    title: "Se arman solas",
    desc: "Generadas del contenido real, con repetición espaciada para retener mejor.",
  },
  {
    tag: "MAPAS MENTALES",
    title: "Los temas, conectados",
    desc: "Visualizá relaciones entre conceptos, no solo una lista.",
  },
  {
    tag: "QUIZ",
    title: "Ponete a prueba",
    desc: "Preguntas de opción múltiple generadas de tu material de estudio.",
  },
  {
    tag: "STUDE TUTOR",
    title: "Preguntale a la IA",
    desc: "Chat contextual con la información de tu clase para resolver dudas.",
  },
];

function ToolFeatures() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="mx-auto grid max-w-4xl gap-3 px-4 sm:grid-cols-2 sm:px-6"
    >
      {TOOL_FEATURES.map((f, i) => (
        <div
          key={i}
          className="group relative overflow-hidden rounded-xl border p-5 transition-all duration-500 hover:-translate-y-1"
          style={{
            borderColor: visible ? PAPER.border : PAPER.borderSoft,
            backgroundColor: PAPER.card,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transitionDelay: `${i * 60}ms`,
          }}
        >
          {/* Decorative dot */}
          <div
            className="pointer-events-none absolute -right-3 -top-3 h-8 w-8 rounded-full"
            style={{ backgroundColor: `${PAPER.marker}80` }}
          />
          <span
            className="mb-3 block text-[9px] font-medium tracking-widest"
            style={{ fontFamily: "var(--font-space-mono)", color: PAPER.moss }}
          >
            {f.tag}
          </span>
          <h3
            className="text-base font-medium"
            style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
          >
            {f.title}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: PAPER.inkSoft }}>
            {f.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Stats ──────────────────────────────────────────────────────────────

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;
        obs.unobserve(el);
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 50));
        const interval = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(interval);
          }
          setValue(current);
        }, 20);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, suffix]);

  return <span ref={ref}>{value}{suffix}</span>;
}

// ─── Testimonials (Sticky Note Style) ──────────────────────────────────

const TESTIMONIALS = [
  {
    text: "Studere me salvó el final. Cargué la grabación y en 5 minutos tenía flashcards y resumen.",
    author: "Lucía M.",
    role: "Medicina",
    rotate: "-2.2deg",
  },
  {
    text: "El mapa mental conectó temas que ni sabía que estaban relacionados. Una masa.",
    author: "Tomás G.",
    role: "Ing. en Sistemas",
    rotate: "1.6deg",
  },
];

function TestimonialNotes() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="mx-auto grid max-w-3xl gap-6 px-4 sm:grid-cols-2 sm:px-6">
      {TESTIMONIALS.map((t, i) => (
        <div
          key={i}
          className="rounded-sm p-5 shadow-lg transition-all duration-700"
          style={{
            backgroundColor: PAPER.marker,
            transform: visible ? `rotate(${t.rotate})` : `rotate(${t.rotate}) translateY(20px)`,
            opacity: visible ? 1 : 0,
            transitionDelay: `${i * 150}ms`,
            boxShadow: `0 8px 20px ${PAPER.shadow}`,
          }}
        >
          <p
            className="mb-4 text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink, fontStyle: "italic" }}
          >
            &ldquo;{t.text}&rdquo;
          </p>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="h-3 w-3" style={{ fill: PAPER.ink, color: PAPER.ink }} />
              ))}
            </div>
          </div>
          <div className="mt-2 text-[10px]" style={{ fontFamily: "var(--font-space-mono)", color: `${PAPER.ink}99` }}>
            {t.author} — {t.role}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Landing Page ──────────────────────────────────────────────────

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Set paper theme on mount, clean up on unmount
  useEffect(() => {
    document.documentElement.classList.add("paper-theme");
    return () => {
      document.documentElement.classList.remove("paper-theme");
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip" style={{ backgroundColor: PAPER.bg }}>
      <GrainBackground />

      {/* ── NAV ── */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? `${PAPER.bg}E0` : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? `1px solid ${PAPER.border}` : "1px solid transparent",
        }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-1.5">
            <span
              className="text-lg font-semibold tracking-tight"
              style={{
                fontFamily: "var(--font-fraunces)",
                fontStyle: "italic",
                fontWeight: 600,
                color: PAPER.ink,
              }}
            >
              Studere
            </span>
            <AnimatedSquiggly />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 hover:opacity-70"
              style={{
                fontFamily: "var(--font-space-mono)",
                color: PAPER.inkSoft,
                letterSpacing: "0.04em",
                fontSize: 12,
              }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg px-5 py-2 text-xs font-semibold transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md"
              style={{
                fontFamily: "var(--font-public-sans)",
                backgroundColor: PAPER.ink,
                color: PAPER.card,
                fontSize: 12,
                boxShadow: scrolled ? "2px 2px 0 rgba(30,39,51,0.2)" : "none",
              }}
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-8 pt-28 sm:px-6 sm:pt-36">
        <div className="mb-10 text-center">
          {/* Eyebrow */}
          <div className="mx-auto mb-6 inline-flex items-center gap-2">
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ backgroundColor: PAPER.crimson }}
            />
            <span
              className="text-[10px] tracking-[0.15em]"
              style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
            >
              AUDIO → APUNTES → REPASO
            </span>
          </div>

          {/* Title */}
          <h1
            className="mx-auto max-w-3xl text-balance px-2 text-[clamp(36px,5vw,56px)] leading-[1.08] font-medium -tracking-[0.01em]"
            style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
          >
            Grabá la clase.
            <br />
            Nosotros hacemos{" "}
            <span className="relative whitespace-nowrap italic font-semibold">
              <span
                className="absolute -left-1 -right-1 bottom-[0.08em] z-[-1] skew-[-8deg] -rotate-[1deg] opacity-90"
                style={{ height: "0.48em", backgroundColor: PAPER.marker }}
              />
              los apuntes
            </span>
            .
          </h1>

          {/* Sub */}
          <p
            className="mx-auto mt-5 max-w-lg text-balance text-base leading-relaxed"
            style={{ color: PAPER.inkSoft }}
          >
            Subí la grabación y en minutos tenés transcripción, flashcards,
            mapas mentales y quizzes — listos para repasar antes del parcial.
          </p>

          {/* CTA */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-sm px-7 py-3 text-sm font-semibold transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-md"
              style={{
                backgroundColor: PAPER.ink,
                color: PAPER.card,
                border: `1.5px solid ${PAPER.ink}`,
                boxShadow: "3px 3px 0 rgba(30,39,51,0.2)",
              }}
            >
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#scroll-demo"
              className="inline-flex items-center gap-1.5 rounded-sm border px-6 py-3 text-sm font-medium transition-all duration-200 hover:border-current"
              style={{
                fontFamily: "var(--font-public-sans)",
                color: PAPER.ink,
                borderColor: PAPER.border,
              }}
            >
              Ver cómo funciona
              <ChevronDown className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Meta */}
          <div
            className="mt-6 flex items-center justify-center gap-4 text-[11px] tracking-wide"
            style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
          >
            <span>120+ HRS TRANSCRITAS</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">5,000+ FLASHCARDS</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">99% PRECISIÓN</span>
          </div>
        </div>

        {/* ── Hero Flip Card Demo ── */}
        <div className="relative mx-auto mb-6 max-w-lg">
          {/* Stack shadows */}
          <div
            className="absolute -inset-x-2 -top-2 bottom-2 rounded-xl border"
            style={{ backgroundColor: PAPER.card, borderColor: PAPER.border, transform: "rotate(-3deg)" }}
          />
          <div
            className="absolute -inset-x-1 bottom-1 top-1 rounded-xl border"
            style={{ backgroundColor: PAPER.card, borderColor: PAPER.borderSoft, transform: "rotate(2deg)" }}
          />

          {/* Card with side panels */}
          <div
            className="relative rounded-xl border p-6"
            style={{ backgroundColor: PAPER.card, borderColor: PAPER.border }}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* Left: waveform */}
              <div className="flex-1">
                <span
                  className="mb-3 block text-[10px] tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
                >
                  CLASE GRABADA
                </span>
                <div className="flex items-end gap-1" style={{ height: 60 }}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 animate-pulse rounded-t-sm"
                      style={{
                        height: `${Math.max(8, 20 + Math.sin(i * 0.9) * 30 + 10)}%`,
                        backgroundColor: i % 3 === 0 ? PAPER.moss : i % 3 === 1 ? PAPER.ink : PAPER.inkSoft,
                        animationDelay: `${i * 0.06}s`,
                        animationDuration: "1s",
                      }}
                    />
                  ))}
                </div>
                <span
                  className="mt-2 block text-[11px]"
                  style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
                >
                  Biología celular — 18:42
                </span>
              </div>

              {/* Divider */}
              <div className="hidden w-px self-stretch sm:block" style={{ backgroundColor: PAPER.borderSoft }} />

              {/* Right: flashcard preview */}
              <div className="flex-1 text-center">
                <span
                  className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[9px] tracking-wider"
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    backgroundColor: `${PAPER.marker}70`,
                    color: PAPER.ink,
                  }}
                >
                  FLASHCARD GENERADA
                </span>
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
                >
                  ¿Qué función cumple la <span className="font-semibold italic">mitocondria</span>?
                </p>
                <div
                  className="mt-3 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[9px]"
                  style={{ fontFamily: "var(--font-space-mono)", color: PAPER.moss, backgroundColor: `${PAPER.moss}10` }}
                >
                  <Check className="h-2.5 w-2.5" />
                  AGREGADA A TU MAZO
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll prompt */}
        <div className="flex animate-bounce items-center justify-center gap-1.5 pt-2">
          <span
            className="text-[9px] tracking-[0.2em]"
            style={{ fontFamily: "var(--font-space-mono)", color: `${PAPER.inkSoft}80` }}
          >
            DESCUBRÍ MÁS
          </span>
          <ChevronDown className="h-3 w-3" style={{ color: `${PAPER.inkSoft}80` }} />
        </div>
      </section>

      {/* ── SCROLL STORYTELLING ── */}
      <div id="scroll-demo" />
      <ScrollStorytelling />

      {/* ── INPUT METHODS ── */}
      <section className="relative z-10 pb-16 pt-8">
        <div className="mx-auto mb-10 max-w-4xl px-4 text-center sm:px-6">
          <span
            className="mb-2 block text-[10px] tracking-[0.2em]"
            style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
          >
            LO QUE LE PODÉS SUBIR
          </span>
          <h2
            className="text-xl font-medium sm:text-2xl"
            style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
          >
            Grabación, video, apuntes o una foto del pizarrón
          </h2>
        </div>
        <InputMethods />
      </section>

      {/* ── TOOL FEATURES ── */}
      <section className="relative z-10 pb-16">
        <div className="mx-auto mb-10 max-w-4xl px-4 text-center sm:px-6">
          <span
            className="mb-2 block text-[10px] tracking-[0.2em]"
            style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
          >
            TODO SALE DE LA MISMA GRABACIÓN
          </span>
          <h2
            className="text-xl font-medium sm:text-2xl"
            style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
          >
            Seis herramientas en una
          </h2>
        </div>
        <ToolFeatures />
      </section>

      {/* ── STATS ── */}
      <section className="relative z-10 pb-16">
        <div
          className="mx-auto grid max-w-4xl grid-cols-2 border-y sm:grid-cols-4"
          style={{ borderColor: PAPER.border }}
        >
          {[
            { target: 120, suffix: "+", label: "HORAS TRANSCRITAS" },
            { target: 5000, suffix: "+", label: "FLASHCARDS GENERADAS" },
            { target: 99, suffix: "%", label: "PRECISIÓN" },
            { target: 6, suffix: "", label: "HERRAMIENTAS" },
          ].map((s, i) => (
            <div
              key={i}
              className="px-4 py-8 text-center sm:py-10"
              style={{ borderRight: i < 3 ? `1px solid ${PAPER.border}` : "none" }}
            >
              <span
                className="block text-3xl font-bold sm:text-4xl"
                style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
              >
                <AnimatedCounter target={s.target} suffix={s.suffix} />
              </span>
              <span
                className="mt-1 block text-[9px] tracking-[0.15em]"
                style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative z-10 pb-16">
        <div className="mx-auto mb-10 max-w-4xl px-4 text-center sm:px-6">
          <span
            className="mb-2 block text-[10px] tracking-[0.2em]"
            style={{ fontFamily: "var(--font-space-mono)", color: PAPER.inkSoft }}
          >
            ALUMNOS
          </span>
          <h2
            className="text-xl font-medium sm:text-2xl"
            style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
          >
            Lo que dicen los que ya la usan
          </h2>
        </div>
        <TestimonialNotes />
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div
          className="relative overflow-hidden rounded-xl px-8 py-12 text-center sm:px-14 sm:py-16"
          style={{
            backgroundColor: PAPER.ink,
            border: `2px dashed ${PAPER.card}40`,
          }}
        >
          {/* Decorative blur circles */}
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full opacity-20"
            style={{ backgroundColor: PAPER.marker, filter: "blur(80px)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full opacity-15"
            style={{ backgroundColor: PAPER.moss, filter: "blur(80px)" }}
          />

          <div className="relative z-10">
            <h2
              className="text-2xl font-medium sm:text-3xl"
              style={{ fontFamily: "var(--font-fraunces)", color: PAPER.card }}
            >
              Empezá a estudiar distinto
            </h2>
            <p
              className="mx-auto mt-3 max-w-md text-sm leading-relaxed"
              style={{ color: `${PAPER.card}B0` }}
            >
              Gratis. Sin tarjeta. Convertí tu próxima clase en material de
              estudio en minutos.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-sm px-8 py-3.5 text-sm font-semibold transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{
                  backgroundColor: PAPER.marker,
                  color: PAPER.ink,
                  border: `1.5px solid ${PAPER.marker}`,
                  boxShadow: "3px 3px 0 rgba(243,238,223,0.3)",
                }}
              >
                Crear cuenta gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 rounded-sm border px-6 py-3.5 text-sm font-medium transition-all duration-200 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-public-sans)",
                  color: PAPER.card,
                  borderColor: `${PAPER.card}40`,
                }}
              >
                Ya tengo cuenta
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px]"
              style={{ color: `${PAPER.card}80` }}
            >
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" style={{ color: PAPER.marker }} />
                Sin compromisos
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" style={{ color: PAPER.marker }} />
                Tus datos seguros
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" style={{ color: PAPER.marker }} />
                Sin límite de uso
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="relative z-10 border-t px-4 py-8"
        style={{ borderColor: PAPER.borderSoft }}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 text-[11px] sm:flex-row" style={{ color: PAPER.inkSoft }}>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold italic"
              style={{ fontFamily: "var(--font-fraunces)", color: PAPER.ink }}
            >
              Studere
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 10 }}>
            TU COPILOTO DE ESTUDIO — 2026
          </span>
        </div>
      </footer>
    </div>
  );
}

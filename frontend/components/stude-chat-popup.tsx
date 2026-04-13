"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Brain, Copy, GripVertical, Loader2, Minus, X } from "lucide-react";
import { BRAIN_PROMPT_TEMPLATES, buildBrainReply, createChatMessage } from "@/lib/session-utils";
import { sendStudeChat } from "@/lib/api";
import { getSessions } from "@/lib/storage";
import { ChatMessage, StudySession } from "@/lib/types";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-xs text-slate-400">…</span>,
});

type StudeChatPopupProps = {
  session: StudySession;
  chatHistory: ChatMessage[];
  onChatUpdate: (messages: ChatMessage[]) => void;
  onClose: () => void;
  onChartDetected?: (chartData: { type: string; description: string; reply: string }) => void;
  initialMessage?: string;
};

const MIN_W = 340;
const MIN_H = 360;
const DEFAULT_W = 400;
const DEFAULT_H = 520;

const CHART_KEYWORDS = [
  "gráfico", "grafico", "chart", "graph", "diagrama", "mapa conceptual",
  "mind map", "pie chart", "bar chart", "line chart", "visualiza",
  "dibuja", "esquema", "tabla comparativa",
];

function detectChartRequest(message: string): string | null {
  const lower = message.toLowerCase();
  for (const kw of CHART_KEYWORDS) {
    if (lower.includes(kw)) {
      if (lower.includes("pie") || lower.includes("torta") || lower.includes("circular")) return "pie";
      if (lower.includes("bar") || lower.includes("barra")) return "bar";
      if (lower.includes("line") || lower.includes("línea") || lower.includes("linea") || lower.includes("tendencia")) return "line";
      if (lower.includes("mapa") || lower.includes("mind map") || lower.includes("conceptual") || lower.includes("diagrama") || lower.includes("esquema")) return "mindmap";
      return "bar";
    }
  }
  return null;
}

export function StudeChatPopup({ session, chatHistory, onChatUpdate, onClose, onChartDetected, initialMessage }: StudeChatPopupProps) {
  const [input, setInput] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Dragging
  const [pos, setPos] = useState({ x: Math.max(40, window.innerWidth - DEFAULT_W - 40), y: 100 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory.length]);

  // Focus trap y Escape key
  useEffect(() => {
    // Guardar foco anterior
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // Focus al popup al montar
    popupRef.current?.focus();

    // Handler para Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Focus trap
      if (e.key === 'Tab' && popupRef.current) {
        const focusableElements = popupRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Retornar foco al elemento anterior
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  // Auto-send initial message once
  useEffect(() => {
    if (initialMessage && !initialSentRef.current) {
      initialSentRef.current = true;
      sendMessage(initialMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 100, dragRef.current.origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.origY + dy)),
      });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  // Resize handlers
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };

    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      setSize({
        w: Math.max(MIN_W, resizeRef.current.origW + dw),
        h: Math.max(MIN_H, resizeRef.current.origH + dh),
      });
    }
    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size]);

  async function sendMessage(message: string) {
    const userMsg = createChatMessage(`user-${Date.now()}`, "user", message);
    const withUser = [...chatHistory, userMsg];
    onChatUpdate(withUser);
    setThinking(true);

    let reply: string;
    try {
      reply = await sendStudeChat({
        message,
        sessionContext: {
          title: session.title,
          course: session.course,
          summary: session.summary,
          concepts: session.keyConcepts,
          transcriptSnippet: session.transcript.slice(0, 20).map((s) => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join("\n"),
        },
        chatHistory: withUser.slice(-16).map((m) => ({ role: m.role, content: m.content })),
      });
    } catch {
      // Fallback to local heuristics
      const allSessions = getSessions();
      reply = buildBrainReply(session, message, allSessions);
    }

    setThinking(false);
    const assistantMsg = createChatMessage(`assistant-${Date.now() + 1}`, "assistant", reply);
    onChatUpdate([...withUser, assistantMsg]);

    // Check if this is a chart request
    const chartType = detectChartRequest(message);
    if (chartType && onChartDetected) {
      onChartDetected({ type: chartType, description: message, reply });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  }

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-modal="true"
      aria-label="Chat con Stude IA"
      tabIndex={-1}
      className="fixed z-50 flex flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: minimized ? 52 : size.h,
        transition: minimized ? "height 0.2s ease" : undefined,
      }}
    >
      {/* Title bar — draggable */}
      <div
        onMouseDown={onDragStart}
        className="flex h-[52px] shrink-0 cursor-move items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 dark:border-slate-800 dark:from-violet-950/40 dark:to-fuchsia-950/30"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-sky-500 text-white">
          <Brain className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Stude</span>
        <button
          onClick={() => setMinimized((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Minimizar"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`group/msg relative rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                  msg.role === "assistant"
                    ? "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    : "ml-8 whitespace-pre-wrap bg-violet-600 text-white"
                }`}
              >
                {msg.role === "assistant" ? <Md>{msg.content}</Md> : msg.content}
                {msg.role === "assistant" && (
                  <button
                    onClick={() => navigator.clipboard?.writeText(msg.content)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 opacity-0 transition hover:text-slate-700 group-hover/msg:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-slate-200"
                    aria-label="Copiar"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                <span className="text-xs text-slate-400 dark:text-slate-500">Stude está pensando…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
            {BRAIN_PROMPT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => sendMessage(tpl.prompt)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={2}
              placeholder="Preguntale a Stude..."
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
            />
            <button
              type="submit"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white transition hover:opacity-90"
            >
              <Brain className="h-4 w-4" />
            </button>
          </form>

          {/* Resize handle */}
          <div
            onMouseDown={onResizeStart}
            className="absolute bottom-0 right-0 flex h-5 w-5 cursor-se-resize items-center justify-center text-slate-300"
          >
            <GripVertical className="h-3 w-3 rotate-[-45deg]" />
          </div>
        </>
      )}
    </div>
  );
}

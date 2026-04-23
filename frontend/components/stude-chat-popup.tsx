"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Brain, Copy, GripVertical, Loader2, Minus, X } from "lucide-react";
import { BRAIN_PROMPT_TEMPLATES, buildBrainReply, createChatMessage } from "@/lib/session-utils";
import { sendStudeChat } from "@/lib/api";
import { getSessions } from "@/lib/storage";
import { ChatMessage, StudySession } from "@/lib/types";
import { useToastContext } from "@/components/toast-provider";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-[11px] text-c-muted">…</span>,
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
  const toast = useToastContext();
  const [input, setInput] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Dragging
  const [pos, setPos] = useState({ x: 40, y: 100 });
  useEffect(() => {
    setPos({ x: Math.max(40, window.innerWidth - DEFAULT_W - 40), y: 100 });
  }, []);
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

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function sendMessage(message: string) {
    const userMsg = createChatMessage(`user-${Date.now()}`, "user", message);
    const withUser = [...chatHistory, userMsg];
    onChatUpdate(withUser);
    setThinking(true);

    let reply: string;
    let usedFallback = false;
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
    } catch (error) {
      console.error("Chat API failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.warning("Chat con IA no disponible", `${errorMessage}. Usando respuestas locales.`);
      // Fallback to local heuristics
      const allSessions = getSessions();
      reply = buildBrainReply(session, message, allSessions);
      usedFallback = true;
    }

    if (!isMountedRef.current) return;
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
    if (!input.trim() || thinking) return;
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
      className="fixed z-50 flex flex-col overflow-hidden rounded-panel border border-c-border bg-c-surface shadow-card"
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
        className="flex h-[52px] shrink-0 cursor-move items-center gap-2 border-b border-c-border bg-c-surface px-3"
      >
        <div className="flex items-center justify-center rounded-pill border border-c-blue-border bg-c-blue-soft px-2 py-0.5">
          <Brain className="h-3 w-3 text-c-blue" />
        </div>
        <span className="flex-1 text-[12px] font-semibold text-c-text">Stude</span>
        <button
          onClick={() => setMinimized((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-btn text-c-muted transition hover:bg-c-surface-2 hover:text-c-text focus-visible:outline-none"
          aria-label="Minimizar"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-btn text-c-muted transition hover:bg-c-red-soft hover:text-c-red focus-visible:outline-none"
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
                className={`group/msg relative px-3.5 py-2.5 text-[12px] ${
                  msg.role === "assistant"
                    ? "rounded-card border border-c-border bg-c-surface-2 text-c-text"
                    : "ml-8 whitespace-pre-wrap rounded-card border border-c-blue-border bg-c-blue-soft text-c-text"
                }`}
              >
                {msg.role === "assistant" ? <Md>{msg.content}</Md> : msg.content}
                {msg.role === "assistant" && (
                  <button
                    onClick={() => navigator.clipboard?.writeText(msg.content)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-btn border border-c-border bg-c-surface text-c-muted opacity-0 transition hover:text-c-text focus-visible:opacity-100 focus-visible:outline-none group-hover/msg:opacity-100"
                    aria-label="Copiar"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 rounded-card border border-c-border bg-c-surface-2 px-3.5 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-c-blue" />
                <span className="text-[11px] text-c-muted">Stude está pensando…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5 border-t border-c-border px-3 py-2">
            {BRAIN_PROMPT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => sendMessage(tpl.prompt)}
                className="rounded-btn border border-c-border bg-c-surface px-2.5 py-1 text-[11px] text-c-muted transition hover:border-c-blue-border hover:bg-c-surface-2 hover:text-c-text focus-visible:outline-none"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-c-border p-3">
            <label htmlFor="stude-chat-input" className="sr-only">Mensaje para Stude</label>
            <textarea
              id="stude-chat-input"
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
              className="flex-1 resize-none rounded-input border border-c-border bg-c-surface-2 px-3 py-2 text-[12px] leading-5 text-c-text outline-none placeholder:text-c-muted focus:border-c-blue-border focus:outline-none"
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              aria-label="Enviar mensaje"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-c-blue text-white transition hover:opacity-90 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Brain className="h-4 w-4" />
            </button>
          </form>

          {/* Resize handle */}
          <div
            onMouseDown={onResizeStart}
            className="absolute bottom-0 right-0 flex h-5 w-5 cursor-se-resize items-center justify-center text-c-border"
          >
            <GripVertical className="h-3 w-3 rotate-[-45deg]" />
          </div>
        </>
      )}
    </div>
  );
}

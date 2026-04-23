"use client";

import { type ComponentPropsWithoutRef } from "react";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  AlertTriangle,
  Info,
  Lightbulb,
  GraduationCap,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node)
    return extractText((node as any).props.children);
  return "";
}

const CALLOUT_COLORS: Record<string, {
  border: string; bg: string; text: string; icon: string;
}> = {
  emerald: {
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-500 dark:text-emerald-400"
  },
  amber: {
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-500 dark:text-amber-400"
  },
  blue: {
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-500 dark:text-blue-400"
  },
  violet: {
    border: "border-violet-200 dark:border-violet-800",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
    icon: "text-violet-500 dark:text-violet-400"
  },
  red: {
    border: "border-red-200 dark:border-red-800",
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    icon: "text-red-500 dark:text-red-400"
  },
};

function Callout({
  icon,
  color,
  label,
  children,
}: {
  icon: React.ReactNode;
  color: keyof typeof CALLOUT_COLORS;
  label: string;
  children: React.ReactNode;
}) {
  const c = CALLOUT_COLORS[color] ?? CALLOUT_COLORS.violet;
  return (
    <div className={`my-4 flex gap-3 rounded-2xl border ${c.border} ${c.bg} p-4`}>
      <div className={`mt-0.5 shrink-0 ${c.icon}`}>{icon}</div>
      <div className={`text-sm leading-7 ${c.text} [&>p]:mb-0 [&>p]:text-inherit`}>
        <span className="font-bold">{label}:</span> {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown renderer — full markdown with KaTeX, GFM tables, code highlight,
// and custom callout boxes (> **Tip:**, > **Warning:**, etc.)
// ---------------------------------------------------------------------------
export default function Md({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={`stude-markdown ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        blockquote: ({
          children: inner,
          ...props
        }: ComponentPropsWithoutRef<"blockquote">) => {
          const text = extractText(inner);
          const lower = text.toLowerCase();
          if (lower.startsWith("tip:") || lower.startsWith("consejo:")) {
            return (
              <Callout icon={<Lightbulb className="h-4 w-4" />} color="emerald" label="Consejo">
                {inner}
              </Callout>
            );
          }
          if (lower.startsWith("warning:") || lower.startsWith("atención:") || lower.startsWith("atencion:")) {
            return (
              <Callout icon={<AlertTriangle className="h-4 w-4" />} color="amber" label="Atención">
                {inner}
              </Callout>
            );
          }
          if (lower.startsWith("important:") || lower.startsWith("importante:")) {
            return (
              <Callout icon={<Info className="h-4 w-4" />} color="blue" label="Importante">
                {inner}
              </Callout>
            );
          }
          if (lower.startsWith("exam:") || lower.startsWith("examen:")) {
            return (
              <Callout icon={<GraduationCap className="h-4 w-4" />} color="violet" label="Para el examen">
                {inner}
              </Callout>
            );
          }
          return (
            <blockquote className="my-3 border-l-4 border-slate-300 pl-4 italic text-slate-500 dark:border-slate-700 dark:text-slate-400" {...props}>
              {inner}
            </blockquote>
          );
        },
        table: ({ children: inner, ...props }: ComponentPropsWithoutRef<"table">) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm" {...props}>{inner}</table>
          </div>
        ),
        thead: ({ children: inner, ...props }: ComponentPropsWithoutRef<"thead">) => (
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400" {...props}>{inner}</thead>
        ),
        th: ({ children: inner, ...props }: ComponentPropsWithoutRef<"th">) => (
          <th className="px-4 py-2.5 text-left" {...props}>{inner}</th>
        ),
        td: ({ children: inner, ...props }: ComponentPropsWithoutRef<"td">) => (
          <td className="border-t border-slate-100 px-4 py-2.5 text-slate-600 dark:border-slate-800 dark:text-slate-400" {...props}>{inner}</td>
        ),
        code: ({
          className: cn,
          children: inner,
          ...props
        }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
          const isBlock = cn?.startsWith("hljs") || cn?.startsWith("language-");
          if (isBlock) {
            return (
              <code className={`${cn} rounded-xl !bg-slate-900 !text-sm`} {...props}>
                {inner}
              </code>
            );
          }
          return (
            <code className="rounded-md bg-violet-50 px-1.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" {...props}>
              {inner}
            </code>
          );
        },
        pre: ({ children: inner, ...props }: ComponentPropsWithoutRef<"pre">) => (
          <pre className="my-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm" {...props}>{inner}</pre>
        ),
        h1: ({ children: inner, ...props }: ComponentPropsWithoutRef<"h1">) => (
          <h1 className="mb-3 mt-6 text-xl font-bold text-slate-900 dark:text-slate-100" {...props}>{inner}</h1>
        ),
        h2: ({ children: inner, ...props }: ComponentPropsWithoutRef<"h2">) => (
          <h2 className="mb-2 mt-5 text-lg font-bold text-slate-900 dark:text-slate-100" {...props}>{inner}</h2>
        ),
        h3: ({ children: inner, ...props }: ComponentPropsWithoutRef<"h3">) => (
          <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900 dark:text-slate-100" {...props}>{inner}</h3>
        ),
        p: ({ children: inner, ...props }: ComponentPropsWithoutRef<"p">) => (
          <p className="mb-3 text-sm leading-8 text-slate-600 dark:text-slate-400" {...props}>{inner}</p>
        ),
        ul: ({ children: inner, ...props }: ComponentPropsWithoutRef<"ul">) => (
          <ul className="mb-3 ml-5 list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400" {...props}>{inner}</ul>
        ),
        ol: ({ children: inner, ...props }: ComponentPropsWithoutRef<"ol">) => (
          <ol className="mb-3 ml-5 list-decimal space-y-1 text-sm text-slate-600 dark:text-slate-400" {...props}>{inner}</ol>
        ),
        li: ({ children: inner, ...props }: ComponentPropsWithoutRef<"li">) => (
          <li className="leading-7" {...props}>{inner}</li>
        ),
        hr: () => <hr className="my-5 border-slate-200 dark:border-slate-800" />,
        a: ({ children: inner, ...props }: ComponentPropsWithoutRef<"a">) => (
          <a className="font-medium text-violet-600 underline decoration-violet-300 hover:text-violet-800 dark:text-violet-400 dark:decoration-violet-600 dark:hover:text-violet-300" {...props}>{inner}</a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
    </div>
  );
}

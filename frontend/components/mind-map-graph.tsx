"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, Minimize2, X } from "lucide-react";
import type { EChartsOption } from "echarts";
import type { MindMapNode, Concept } from "@/lib/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// ── CSS variable resolver (theme-aware) ────────────────────────────────────

function cssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface ChartColors {
  blue: string;
  teal: string;
  violet: string;
  amber: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
}

function readColors(): ChartColors {
  return {
    blue: cssVar("--c-blue") || "#3b5fc0",
    teal: cssVar("--c-teal") || "#0c857a",
    violet: cssVar("--c-violet") || "#7c3aed",
    amber: cssVar("--c-amber") || "#b36205",
    text: cssVar("--c-text") || "#f1f5f9",
    muted: cssVar("--c-muted") || "#94a3b8",
    border: cssVar("--c-border") || "#334155",
    surface: cssVar("--c-surface") || "#1e293b",
  };
}

const CATEGORY_COLORS = [
  "#3b5fc0", // blue
  "#0c857a", // teal
  "#7c3aed", // violet
  "#b36205", // amber
  "#dc2626", // red
];

// ── Tree → flat graph converter ───────────────────────────────────────────

/**
 * Flatten a {@link MindMapNode} tree + {@link Concept} array into
 * ECharts graph format: flat node list + edge list.
 *
 * The root node becomes the **central hub** (largest, boldest).
 * Each child node becomes a concept node connected to the root.
 * Each {@link Concept} from keyConcepts is also added as a node
 * (connected to root) with its description available on click.
 *
 * Edges connect:
 * - root → each child/concept
 * - sibling → sibling (if they share a parent in the tree)
 */
function treeToGraph(
  mindMap: MindMapNode,
  keyConcepts: Concept[],
): { nodes: any[]; links: any[] } {
  const nodes: any[] = [];
  const links: any[] = [];
  const addedIds = new Set<string>();

  // ── 1. Root node (central hub) ─────────────────────────────────
  nodes.push({
    id: mindMap.id,
    name: mindMap.label,
    symbolSize: 48,
    category: 0,
    itemStyle: { color: CATEGORY_COLORS[0] },
    label: { show: true, position: "bottom", fontSize: 14, fontWeight: 700 },
    // Keep accent info for hover highlighting
    _accent: mindMap.accent,
  });
  addedIds.add(mindMap.id);

  // ── 2. Walk tree children ──────────────────────────────────────
  function walk(node: MindMapNode, parentId: string) {
    if (!node.children) return;

    // Add each child as a node connected to parent
    const childIds = node.children.map((c) => c.id);
    node.children.forEach((child) => {
      if (!addedIds.has(child.id)) {
        const catIndex = child.accent
          ? ["violet", "blue", "green", "amber"].indexOf(child.accent) + 1
          : 1;
        const cat = Math.max(0, Math.min(catIndex, CATEGORY_COLORS.length - 1));
        nodes.push({
          id: child.id,
          name: child.label,
          symbolSize: 32,
          category: cat,
          itemStyle: { color: CATEGORY_COLORS[cat] },
          label: { show: true, position: "bottom", fontSize: 11, fontWeight: 500 },
          _accent: child.accent,
        });
        addedIds.add(child.id);
      }

      // Edge parent → child
      links.push({
        source: parentId,
        target: child.id,
        value: 1,
        lineStyle: { width: 1.5, curveness: 0.2 },
      });

      // Recurse into grandchildren
      walk(child, child.id);
    });

    // Connect siblings (shared parent → they're related)
    for (let i = 0; i < childIds.length; i++) {
      for (let j = i + 1; j < childIds.length; j++) {
        links.push({
          source: childIds[i],
          target: childIds[j],
          value: 0.5,
          lineStyle: { width: 1, curveness: 0.4, opacity: 0.3 },
        });
      }
    }
  }

  walk(mindMap, mindMap.id);

  // ── 3. Add keyConcepts as additional nodes ─────────────────────
  keyConcepts.forEach((kc, i) => {
    const kcId = `concept-${i}`;
    if (!addedIds.has(kcId)) {
      nodes.push({
        id: kcId,
        name: kc.term,
        description: kc.description,
        symbolSize: 28,
        category: 2,
        itemStyle: { color: CATEGORY_COLORS[2] },
        label: { show: true, position: "bottom", fontSize: 10, fontWeight: 400 },
      });
      addedIds.add(kcId);

      // Edge: root → concept
      links.push({
        source: mindMap.id,
        target: kcId,
        value: 0.8,
        lineStyle: { width: 1, curveness: 0.3, opacity: 0.5 },
      });
    }
  });

  return { nodes, links };
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface MindMapGraphProps {
  /** Root node of the mind map tree (from session AI generation). */
  mindMap: MindMapNode;
  /** Optional array of key concepts with descriptions. */
  keyConcepts?: Concept[];
}

/**
 * Force-directed concept graph powered by ECharts `series-graph`.
 *
 * Converts the AI-generated mind map tree + key concepts into an
 * interactive force-directed graph where:
 *
 * - The **central hub** is the session's main topic (largest node).
 * - **Child nodes** from the tree are spaced around the hub.
 * - **Key concepts** from the session content appear as additional nodes.
 * - **Sibling connections** show related concepts.
 *
 * Interactions:
 * - **Hover** a node → highlights it and its direct connections; dims others.
 * - **Click** a node → shows a tooltip with its description (if available).
 * - **Drag** a node → repositions it (force simulation continues).
 * - Fullscreen toggle via button in top-right corner.
 *
 * Theme-aware: colour variables are re-read when `dark`/`light` class toggles.
 */
export function MindMapGraph({ mindMap, keyConcepts = [] }: MindMapGraphProps) {
  const chartRef = useRef<any>(null);
  const [colors, setColors] = useState<ChartColors>(readColors);
  const [fullscreen, setFullscreen] = useState(false);
  const [clickedNodeName, setClickedNodeName] = useState<string | null>(null);

  // Sync colours on theme change
  useEffect(() => {
    const sync = () => setColors(readColors());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, []);

  // Convert tree → flat graph
  const { nodes, links } = useMemo(
    () => treeToGraph(mindMap, keyConcepts),
    [mindMap, keyConcepts],
  );

  // Clicked node info (tooltip)
  const clickedInfo = useMemo(() => {
    if (!clickedNodeName) return null;
    const concept = keyConcepts.find((kc) => kc.term === clickedNodeName);
    if (concept) return { title: concept.term, desc: concept.description };
    return { title: clickedNodeName, desc: null };
  }, [clickedNodeName, keyConcepts]);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen]);

  const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  // ResizeObserver to keep chart size in sync with container
  useEffect(() => {
    const el = chartRef.current?.getEchartsInstance();
    if (!el) return;
    const ro = new ResizeObserver(() => el.resize());
    const target = document.getElementById("mindmap-container");
    if (target) ro.observe(target);
    return () => ro.disconnect();
  }, []);

  // ── ECharts options (memoized) ─────────────────────────────────
  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: "item" as const,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 10,
        padding: [10, 14],
        textStyle: { color: colors.text, fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.data) return "";
          const name = params.name || "";
          const desc = params.data.description || "";
          let html = `<div style="font-weight:600;font-size:13px;margin-bottom:4px">${name}</div>`;
          if (desc) html += `<div style="font-size:11px;color:${colors.muted};line-height:1.5">${desc}</div>`;
          return html;
        },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          center: ["50%", "50%"],
          force: {
            repulsion: 600,
            edgeLength: [80, 200],
            layoutAnimation: true,
            friction: 0.08,
            gravity: 0.05,
          },
          roam: true,
          draggable: true,
          data: nodes,
          links: links,
          categories: [
            { name: "Central", itemStyle: { color: CATEGORY_COLORS[0] } },
            { name: "Branch", itemStyle: { color: CATEGORY_COLORS[1] } },
            { name: "Concept", itemStyle: { color: CATEGORY_COLORS[2] } },
            { name: "Detail", itemStyle: { color: CATEGORY_COLORS[3] } },
          ],
          edgeSymbol: ["none", "none"],
          edgeLabel: { show: false },
          lineStyle: {
            color: "source",
            curveness: 0.2,
            opacity: 0.4,
            width: 1.5,
          },
          label: {
            show: true,
            position: "bottom",
            fontSize: 11,
            color: colors.text,
          },
          emphasis: {
            focus: "adjacency" as const,
            lineStyle: { width: 2.5, opacity: 0.8 },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0,0,0,0.3)",
            },
          },
          blur: {
            opacity: 0.2,
            lineStyle: { opacity: 0.1 },
          },
          animationDuration: 800,
          animationEasing: "cubicOut",
        },
      ],
    }),
    [nodes, links, colors],
  );

  // ── Click handler ──────────────────────────────────────────────
  const onEvents = useMemo(
    () => ({
      click: (params: any) => {
        if (params?.data?.name) {
          setClickedNodeName(params.data.name);
        }
      },
    }),
    [],
  );

  const canvas = (
    <div
      id="mindmap-container"
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-c-bg"
          : "relative flex flex-col h-[450px] w-full overflow-hidden rounded-panel border border-c-border bg-c-surface"
      }
    >
      {/* Click info bar */}
      {clickedInfo && (
        <div
          className="relative z-10 mx-3 mt-3 flex items-start gap-3 rounded-card border border-c-blue-border bg-c-blue-soft px-4 py-3 text-left"
          style={{ maxWidth: "calc(100% - 24px)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-c-blue">{clickedInfo.title}</p>
            {clickedInfo.desc && (
              <p className="mt-1 text-[11px] leading-relaxed text-c-muted">{clickedInfo.desc}</p>
            )}
          </div>
          <button
            onClick={() => setClickedNodeName(null)}
            className="shrink-0 rounded-btn p-1 text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
            aria-label="Cerrar detalle"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ECharts graph */}
      <div className="flex-1 min-h-0">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: "100%", width: "100%" }}
          onEvents={onEvents}
          notMerge
          lazyUpdate
        />
      </div>

      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-btn border border-c-border bg-c-surface text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
        aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      {fullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-btn border border-c-border bg-c-surface text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // Empty state
  if (!mindMap || !mindMap.label) {
    return (
      <div className="flex h-[450px] items-center justify-center rounded-panel border border-c-border bg-c-surface">
        <p className="text-[12px] text-c-muted">No hay mapa conceptual disponible.</p>
      </div>
    );
  }

  return canvas;
}

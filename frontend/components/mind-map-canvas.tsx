"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
  Handle,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MindMapNode } from "@/lib/types";

/* ─── colour palette keyed by accent ─── */
const ACCENT_STYLES: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  violet: { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-900", ring: "#7c3aed" },
  blue:   { bg: "bg-sky-100",    border: "border-sky-300",    text: "text-sky-900",    ring: "#0284c7" },
  green:  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-900", ring: "#059669" },
  amber:  { bg: "bg-amber-100",  border: "border-amber-300",  text: "text-amber-900",  ring: "#d97706" },
};

function accentFor(accent?: string) {
  return ACCENT_STYLES[accent ?? "violet"] ?? ACCENT_STYLES.violet;
}

/* ─── custom node component ─── */
function MindMapNodeComponent({ data }: { data: { label: string; accent?: string; isRoot?: boolean } }) {
  const style = accentFor(data.accent);

  const accent = data.accent || "violet";
  const darkBg = { violet: "rgba(139,92,246,0.15)", blue: "rgba(14,165,233,0.15)", green: "rgba(16,185,129,0.15)", amber: "rgba(245,158,11,0.15)" }[accent] ?? "rgba(139,92,246,0.15)";
  const darkBorder = { violet: "rgba(139,92,246,0.4)", blue: "rgba(14,165,233,0.4)", green: "rgba(16,185,129,0.4)", amber: "rgba(245,158,11,0.4)" }[accent] ?? "rgba(139,92,246,0.4)";
  const darkText = { violet: "#c4b5fd", blue: "#7dd3fc", green: "#6ee7b7", amber: "#fcd34d" }[accent] ?? "#c4b5fd";

  return (
    <div
      className={`rounded-2xl border px-4 py-2.5 text-center shadow-sm transition-shadow hover:shadow-md ${style.bg} ${style.border} dark:bg-transparent`}
      style={{ maxWidth: 220, minWidth: data.isRoot ? 180 : 120, backgroundColor: darkBg, borderColor: darkBorder }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2 dark:!bg-slate-600" />
      <p className={`text-xs font-semibold leading-snug ${style.text} ${data.isRoot ? "text-sm" : ""}`} style={{ color: darkText }}>
        {data.label}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2 dark:!bg-slate-600" />
    </div>
  );
}

const nodeTypes = { mindmap: MindMapNodeComponent };

/* ─── tree → ReactFlow nodes/edges ─── */
const H_GAP = 200;
const V_GAP = 90;

type LayoutResult = { nodes: Node[]; edges: Edge[]; width: number };

function layoutTree(node: MindMapNode, x: number, y: number, depth: number): LayoutResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: node.id,
    type: "mindmap",
    position: { x, y },
    data: { label: node.label, accent: node.accent ?? "violet", isRoot: depth === 0 },
  });

  if (!node.children?.length) {
    return { nodes, edges, width: H_GAP };
  }

  const childResults = node.children.map((child) =>
    layoutTree(child, 0, 0, depth + 1)
  );

  const totalWidth = childResults.reduce((sum, r) => sum + r.width, 0);
  let offsetX = x - totalWidth / 2;

  childResults.forEach((result, i) => {
    const child = node.children![i];
    const childX = offsetX + result.width / 2;
    const childY = y + V_GAP;

    // Shift all nodes in this subtree
    const dx = childX - result.nodes[0].position.x;
    const dy = childY - result.nodes[0].position.y;
    for (const n of result.nodes) {
      n.position.x += dx;
      n.position.y += dy;
    }

    nodes.push(...result.nodes);
    edges.push(...result.edges);
    edges.push({
      id: `e-${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: "smoothstep",
      style: { stroke: accentFor(child.accent).ring, strokeWidth: 2 },
      animated: depth === 0,
    });

    offsetX += result.width;
  });

  return { nodes, edges, width: Math.max(H_GAP, totalWidth) };
}

/* ─── main component ─── */
type MindMapCanvasProps = {
  mindMap: MindMapNode;
};

export function MindMapCanvas({ mindMap }: MindMapCanvasProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const { initialNodes, initialEdges } = useMemo(() => {
    const result = layoutTree(mindMap, 400, 30, 0);
    return { initialNodes: result.nodes, initialEdges: result.edges };
  }, [mindMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when mindMap changes
  useEffect(() => {
    const result = layoutTree(mindMap, 400, 30, 0);
    setNodes(result.nodes);
    setEdges(result.edges);
  }, [mindMap, setNodes, setEdges]);

  const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  useEffect(() => {
    if (!fullscreen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen]);

  const canvas = (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-c-bg" : "relative h-[400px] w-full overflow-hidden rounded-panel border border-c-border bg-c-surface"}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148,163,184,0.15)" />
        <Controls showInteractive={false} className="!rounded-card !border-c-border !shadow-none [&>button]:bg-c-surface [&>button]:text-c-muted [&>button]:hover:bg-c-surface-2 [&>button]:border-b [&>button]:border-c-border [&>button]:focus-visible:outline-none" />
        {fullscreen && (
          <MiniMap
            nodeColor={(n) => accentFor(n.data?.accent as string).ring}
            maskColor="rgba(248,250,255,0.8)"
            className="!rounded-card !border-c-border !shadow-none !bg-c-surface-2"
          />
        )}
      </ReactFlow>

      {/* fullscreen toggle */}
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

  return canvas;
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/* ─── colour palette keyed by accent — uses CSS vars for auto dark mode ─── */
const ACCENT_STYLES: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  violet: { bg: "bg-c-violet-soft", border: "border-c-violet-border", text: "text-c-violet", ring: "var(--c-violet)" },
  blue:   { bg: "bg-c-blue-soft",   border: "border-c-blue-border",   text: "text-c-blue",   ring: "var(--c-blue)" },
  green:  { bg: "bg-c-teal-soft",   border: "border-c-teal-border",   text: "text-c-teal",   ring: "var(--c-teal)" },
  amber:  { bg: "bg-c-amber-soft",  border: "border-c-amber/20",      text: "text-c-amber",  ring: "var(--c-amber)" },
};

function accentFor(accent?: string) {
  return ACCENT_STYLES[accent ?? "violet"] ?? ACCENT_STYLES.violet;
}

/* ─── custom node component ─── */
function MindMapNodeComponent({ data }: { data: { label: string; accent?: string; isRoot?: boolean } }) {
  const style = accentFor(data.accent);

  return (
    <div
      className={`rounded-card border px-3 py-2 text-center shadow-sm transition-shadow hover:shadow-md ${style.bg} ${style.border}`}
      style={{ maxWidth: 260, minWidth: data.isRoot ? 200 : 140, padding: '8px 12px' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-c-border !w-2 !h-2" />
      <p className={`text-[11px] font-semibold leading-snug ${style.text} ${data.isRoot ? "text-[13px]" : ""}`}>
        {data.label}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-c-border !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { mindmap: MindMapNodeComponent };

/* ─── tree → ReactFlow nodes/edges ─── */
const H_GAP = 240;
const V_GAP = 110;

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

  // Add aria-labels to ReactFlow Control buttons
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const container = controlsRef.current;
    const observer = new MutationObserver(() => {
      const zoomIn = container.querySelector(".react-flow__controls-zoomin");
      const zoomOut = container.querySelector(".react-flow__controls-zoomout");
      const fitView = container.querySelector(".react-flow__controls-fitview");
      if (zoomIn && !zoomIn.getAttribute("aria-label")) zoomIn.setAttribute("aria-label", "Acercar");
      if (zoomOut && !zoomOut.getAttribute("aria-label")) zoomOut.setAttribute("aria-label", "Alejar");
      if (fitView && !fitView.getAttribute("aria-label")) fitView.setAttribute("aria-label", "Ajustar vista");
    });
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--c-border)" />
        <div ref={controlsRef}>
          <Controls showInteractive={false} className="!rounded-card !border-c-border !shadow-none [&>button]:bg-c-surface [&>button]:text-c-muted [&>button]:hover:bg-c-surface-2 [&>button]:border-b [&>button]:border-c-border [&>button]:focus-visible:outline-none" />
        </div>
        {fullscreen && (
          <MiniMap
            nodeColor={(n) => accentFor(n.data?.accent as string).ring}
            maskColor="var(--c-bg)"
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

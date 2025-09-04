"use client";
import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import EdgeModal, { EdgeDirection } from "@/components/EdgeModal";
import AdjacencyMatrixModal from "@/components/AdjacencyMatrixModal";
import HelpModal from "@/components/HelpModal";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
}
interface Edge {
  id: string;
  from: string;
  to: string;
  value: number;
  directed: boolean;
}

const NODE_RADIUS = 40; // nodo más grande

/** Indices por nodo para self-loops (0,1,2...) */
function useSelfLoopIndexMap(edges: Edge[]) {
  return useMemo(() => {
    const map = new Map<string, number>();
    const indexMap = new Map<string, number>();
    for (const e of edges) {
      if (e.from === e.to) {
        const i = map.get(e.from) ?? 0;
        indexMap.set(e.id, i);
        map.set(e.from, i + 1);
      }
    }
    return indexMap;
  }, [edges]);
}

/** Self-loop bonito y no solapado */
function getSelfLoopPathAndLabel(
  node: Node,
  loopIndex: number
): { d: string; labelX: number; labelY: number } {
  const side = loopIndex % 2 === 0 ? 1 : -1;
  const tier = Math.floor(loopIndex / 2);
  const dx = 46 + tier * 24;
  const dy = 42 + tier * 20;

  const sx = node.x + side * NODE_RADIUS;
  const sy = node.y;
  const cx1 = node.x + side * (NODE_RADIUS + dx);
  const cy1 = node.y - dy;
  const cx2 = node.x + side * (NODE_RADIUS + Math.max(28, dx * 0.6));
  const cy2 = node.y - dy;

  const d = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${sx} ${sy}`;
  const labelX = node.x + side * (NODE_RADIUS + dx * 0.65);
  const labelY = node.y - dy - 6;

  return { d, labelX, labelY };
}

/** Recorta línea en el borde de los nodos para que la flecha no entre al círculo */
function lineEndpoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  padStart: number,
  padEnd: number
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const x1 = from.x + ux * padStart;
  const y1 = from.y + uy * padStart;
  const x2 = to.x - ux * padEnd;
  const y2 = to.y - uy * padEnd;

  return { x1, y1, x2, y2, ux, uy, len };
}

/** Punto sobre una cuadrática (para posicionar etiqueta) */
function quadPoint(
  t: number,
  p0: { x: number; y: number },
  c: { x: number; y: number },
  p1: { x: number; y: number }
) {
  const mt = 1 - t;
  const x = mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x;
  const y = mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y;
  return { x, y };
}

/** Util: nombre de archivo con timestamp */
function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ↓ Añádelo cerca de tus helpers (por ejemplo, bajo nowStamp())
function sanitizeFilename(name: string) {
  // Quita caracteres no válidos en nombres de archivo
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ");
  if (!cleaned) return `graphroom-${nowStamp()}.json`;
  return cleaned.toLowerCase().endsWith(".json") ? cleaned : `${cleaned}.json`;
}

/** Validación simple del payload importado */
function parseAndValidateGraph(jsonText: string): { nodes: Node[]; edges: Edge[] } {
  const raw = JSON.parse(jsonText);
  if (!raw || typeof raw !== "object") throw new Error("JSON inválido.");

  const nodes: Node[] = Array.isArray(raw.nodes) ? raw.nodes : [];
  const edges: Edge[] = Array.isArray(raw.edges) ? raw.edges : [];

  const nodesClean: Node[] = nodes
    .filter((n) => n && typeof n.id === "string")
    .map((n) => ({
      id: String(n.id),
      x: Number.isFinite(Number(n.x)) ? Number(n.x) : 0,
      y: Number.isFinite(Number(n.y)) ? Number(n.y) : 0,
      label: typeof n.label === "string" ? n.label : String(n.id),
    }));

  const idSet = new Set(nodesClean.map((n) => n.id));

  const edgesClean: Edge[] = edges
    .filter((e) => e && typeof e.id === "string" && typeof e.from === "string" && typeof e.to === "string")
    .filter((e) => idSet.has(e.from) && idSet.has(e.to))
    .map((e) => ({
      id: String(e.id),
      from: String(e.from),
      to: String(e.to),
      value: Math.max(0, Math.trunc(Number.isFinite(Number(e.value)) ? Number(e.value) : 0)),
      directed: Boolean(e.directed),
    }));

  return { nodes: nodesClean, edges: edgesClean };
}

export default function GraphBoard() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [nodeCounter, setNodeCounter] = useState(1);

  // Modos
  const [addMode, setAddMode] = useState(false);
  const [deleteNodeMode, setDeleteNodeMode] = useState(false);
  const [deleteEdgeMode, setDeleteEdgeMode] = useState(false);

  // Arrastre
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  // Conexiones
  const [edgeStart, setEdgeStart] = useState<string | null>(null);

  // Modal nodo
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Modal arista (crear/editar)
  const [edgeModalOpen, setEdgeModalOpen] = useState(false);
  const [pendingEdge, setPendingEdge] = useState<{ from: string; to: string } | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);

  // Context menu de aristas
  const [edgeMenu, setEdgeMenu] = useState<{ visible: boolean; x: number; y: number; edgeId: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    edgeId: null,
  });
const [adjOpen, setAdjOpen] = useState(false);
// ↓ Añade estos 2 estados
const [exportOpen, setExportOpen] = useState(false);
const [exportName, setExportName] = useState("");
const [helpOpen, setHelpOpen] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Dark mode colors */
  const strokeColor = "#e5e7eb"; // gray-200
  const textColor = "#e5e7eb";   // gray-200
  const nodeFill = "#57c3d1";

  // Cerrar menú contextual con click global / escape
  useEffect(() => {
    const onDocClick = () => setEdgeMenu((m) => ({ ...m, visible: false }));
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onDocClick(); };
    document.addEventListener("click", onDocClick);
    document.addEventListener("contextmenu", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("contextmenu", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  /** Toggles */
  const toggleAddMode = () => {
    setAddMode((v) => !v);
    setDeleteNodeMode(false);
    setDeleteEdgeMode(false);
    setEdgeStart(null);
    setDraggingNode(null);
  };
  const toggleDeleteNodeMode = () => {
    setDeleteNodeMode((v) => !v);
    setAddMode(false);
    setDeleteEdgeMode(false);
    setEdgeStart(null);
    setDraggingNode(null);
  };
  const toggleDeleteEdgeMode = () => {
    setDeleteEdgeMode((v) => !v);
    setAddMode(false);
    setDeleteNodeMode(false);
    setEdgeStart(null);
    setDraggingNode(null);
  };

  /** Exportar / Importar / Limpiar */
const exportJSON = (filename: string) => {
  const payload = JSON.stringify({ nodes, edges }, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = filename;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

  const triggerImport = () => fileRef.current?.click();
  const onImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const { nodes: nn, edges: ee } = parseAndValidateGraph(text);
      setNodes(nn);
      setEdges(ee);
      const maxNumericId =
        nn
          .map((n) => Number(n.id))
          .filter((x) => Number.isFinite(x))
          .reduce((acc, val) => Math.max(acc, val), 0) || 0;
      setNodeCounter(maxNumericId + 1);
      setAddMode(false);
      setDeleteNodeMode(false);
      setDeleteEdgeMode(false);
      setEdgeStart(null);
      setDraggingNode(null);
    } catch (err: any) {
      alert(`Error al importar JSON: ${err?.message ?? err}`);
    }
  };
  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setNodeCounter(1);
    setAddMode(false);
    setDeleteNodeMode(false);
    setDeleteEdgeMode(false);
    setEdgeStart(null);
    setDraggingNode(null);
  };

  /** Click en pizarra: si addMode => crear nodo */
  const handleBoardClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!addMode) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newNode: Node = { id: `${nodeCounter}`, x, y, label: `Nodo ${nodeCounter}` };
    setNodes((prev) => [...prev, newNode]);
    setNodeCounter((prev) => prev + 1);
  };

  /** Arrastre */
  const handleMouseDown = (id: string) => {
    if (addMode || deleteNodeMode || deleteEdgeMode) return;
    setDraggingNode(id);
  };
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNode) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setNodes((prev) => prev.map((n) => (n.id === draggingNode ? { ...n, x, y } : n)));
  };
  const handleMouseUp = () => setDraggingNode(null);

  /** Click en nodo (solo click simple => e.detail === 1) */
  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail !== 1) return;

    if (deleteNodeMode) {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((ed) => ed.from !== nodeId && ed.to !== nodeId));
      if (edgeStart === nodeId) setEdgeStart(null);
      return;
    }
    if (addMode || deleteEdgeMode) return;

    if (!edgeStart) {
      setEdgeStart(nodeId);
    } else {
      const from = edgeStart;
      const to = nodeId;
      setEdgeStart(null);
      setPendingEdge({ from, to });
      setEditingEdge(null);
      setEdgeModalOpen(true);
    }
  };

  /** Doble clic en nodo => solo renombrar (no conexión) */
  const handleNodeDoubleClick = (node: Node, e: React.MouseEvent) => {
    e.stopPropagation();
    if (addMode || deleteNodeMode || deleteEdgeMode) return;
    setEdgeStart(null);
    setSelectedNode(node);
    setModalOpen(true);
  };

  /** Guardar nombre */
  const saveNodeName = () => {
    if (!selectedNode) return;
    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? selectedNode : n)));
    setModalOpen(false);
  };

  /** Crear arista desde modal */
  const handleCreateEdge = (payload: {
    from: string;
    to: string;
    value: number;
    direction: EdgeDirection;
  }) => {
    let { from, to } = payload;
    let directed = true;
    if (payload.direction === "undirected") directed = false;
    if (payload.direction === "reverse" && from !== to) [from, to] = [to, from];

    const id = `${from}-${to}-${Date.now()}`;
    setEdges((prev) => [...prev, { id, from, to, value: payload.value, directed }]);
    setPendingEdge(null);
  };

  /** Editar arista desde modal */
  const handleSaveEdge = (payload: {
    id: string;
    from: string;
    to: string;
    value: number;
    direction: EdgeDirection;
  }) => {
    setEdges((prev) =>
      prev.map((e) => {
        if (e.id !== payload.id) return e;
        let from = e.from;
        let to = e.to;
        let directed = true;
        if (payload.direction === "undirected") directed = false;
        else if (payload.direction === "reverse" && from !== to) [from, to] = [to, from];
        else directed = true;
        return { ...e, from, to, value: Math.max(0, Math.trunc(payload.value)), directed };
      })
    );
    setEditingEdge(null);
  };

  /** Eliminar arista */
  const removeEdge = (edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  };

  /** Cursor UI */
  const boardCursor =
    addMode || deleteNodeMode || deleteEdgeMode
      ? addMode
        ? "cursor-crosshair"
        : "cursor-no-drop"
      : draggingNode
      ? "cursor-grabbing"
      : "cursor-default";

  /** Índices de self-loops */
  const selfLoopIndexMap = useSelfLoopIndexMap(edges);

  /** ¿Existe arista "espejo" (B→A) para la arista dada? */
  const hasMirror = (edge: Edge) =>
    edges.some((e) => e.id !== edge.id && e.from === edge.to && e.to === edge.from);

  /** Render de una arista (normal o self-loop) */
  const renderEdgeGroup = (edge: Edge, fromNode: Node, toNode: Node) => {
    const handleEdgeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (deleteEdgeMode) removeEdge(edge.id);
    };
    const handleEdgeDblClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingEdge(edge);
      setPendingEdge(null);
      setEdgeModalOpen(true);
    };
    const handleEdgeContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setEdgeMenu({ visible: true, x: e.clientX, y: e.clientY, edgeId: edge.id });
    };

    // --- Self-loop ---
    if (edge.from === edge.to) {
      const i = selfLoopIndexMap.get(edge.id) ?? 0;
      const { d, labelX, labelY } = getSelfLoopPathAndLabel(fromNode, i);
      return (
        <g
          key={edge.id}
          onClick={handleEdgeClick}
          onDoubleClick={handleEdgeDblClick}
          onContextMenu={handleEdgeContextMenu}
          className="group"
        >
          <path
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            markerEnd={edge.directed ? "url(#arrowhead)" : undefined}
            className="transition-opacity group-hover:opacity-80"
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            style={{ fill: textColor }}
            className="text-[10px] select-none"
          >
            {Math.trunc(edge.value)}
          </text>
        </g>
      );
    }

    // --- Arista normal (posible curvatura A↔B) ---

    // 1) Recortar a bordes
    const { x1, y1, x2, y2, ux, uy, len } = lineEndpoints(
      { x: fromNode.x, y: fromNode.y },
      { x: toNode.x, y: toNode.y },
      /* start */ NODE_RADIUS + 2,
      /* end   */ edge.directed ? NODE_RADIUS + 12 : NODE_RADIUS + 2
    );

    // 2) ¿Hay espejo B→A?
    const mirror = hasMirror(edge);

    // 3) Si hay espejo, curvamos. Lado determinista según IDs (para que no "salte")
    if (mirror) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;

      // perpendicular a la dirección
      const px = -uy;
      const py = ux;

      // offset según distancia, con límites
      const base = Math.min(60, Math.max(24, (len - 2 * NODE_RADIUS) * 0.25));
      const side = edge.from < edge.to ? 1 : -1; // 1 y -1 opuestos para A→B y B→A
      const cx = mx + px * base * side;
      const cy = my + py * base * side;

      // punto para label (t=0.5)
      const mid = quadPoint(0.5, { x: x1, y: y1 }, { x: cx, y: cy }, { x: x2, y: y2 });

      const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

      return (
        <g
          key={edge.id}
          onClick={handleEdgeClick}
          onDoubleClick={handleEdgeDblClick}
          onContextMenu={handleEdgeContextMenu}
          className="group"
        >
          <path
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            markerEnd={edge.directed ? "url(#arrowhead)" : undefined}
            className="transition-opacity group-hover:opacity-80"
          />
          <text
            x={mid.x}
            y={mid.y - 6}
            textAnchor="middle"
            style={{ fill: textColor }}
            className="text-[10px] select-none"
          >
            {Math.trunc(edge.value)}
          </text>
        </g>
      );
    }

    // 4) Si NO hay espejo, línea recta recortada
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return (
      <g
        key={edge.id}
        onClick={handleEdgeClick}
        onDoubleClick={handleEdgeDblClick}
        onContextMenu={handleEdgeContextMenu}
        className="group"
      >
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth={2}
          markerEnd={edge.directed ? "url(#arrowhead)" : undefined}
          className="transition-opacity group-hover:opacity-80"
        />
        <text
          x={midX}
          y={midY - 6}
          textAnchor="middle"
          style={{ fill: textColor }}
          className="text-[10px] select-none"
        >
          {Math.trunc(edge.value)}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-96px)] flex flex-col gap-3 bg-neutral-900 text-neutral-100">
      {/* Toolbar */}
      <div className="px-2 py-2 flex flex-wrap items-center gap-2 border-b border-neutral-800 bg-neutral-900">
        <Button color={addMode ? "primary" : "default"} variant={addMode ? "solid" : "flat"} onPress={toggleAddMode}>
          {addMode ? "Agregar nodo: ON (clic en pizarra)" : "Agregar nodo"}
        </Button>
        <Button
          color={deleteNodeMode ? "danger" : "default"}
          variant={deleteNodeMode ? "solid" : "flat"}
          onPress={toggleDeleteNodeMode}
        >
          {deleteNodeMode ? "Eliminar nodo: ON" : "Eliminar nodo"}
        </Button>
        <Button
          color={deleteEdgeMode ? "danger" : "default"}
          variant={deleteEdgeMode ? "solid" : "flat"}
          onPress={toggleDeleteEdgeMode}
        >
          {deleteEdgeMode ? "Eliminar relación: ON" : "Eliminar relación"}
        </Button>
        <Button variant="flat" onPress={() => setAdjOpen(true)}>
          Matriz de adyacencia
        </Button>
<Button variant="flat" onPress={() => setHelpOpen(true)}>
  Ayuda
</Button>

        <div className="mx-3 h-6 w-px bg-neutral-800" />

        <Button variant="flat" onPress={() => setExportOpen(true)}>
          Exportar JSON
        </Button>


        <Button variant="flat" onPress={triggerImport}>Importar JSON</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onImportFileChange}
        />
        <Button color="danger" variant="flat" onPress={clearAll}>Limpiar</Button>

        <span className="text-xs text-neutral-400 ml-auto">
          {edgeStart
            ? `Selecciona el nodo destino para conectar desde ${edgeStart}…`
            : addMode
            ? "Clic en la pizarra para crear nodos. Pulsa el botón para salir."
            : deleteNodeMode
            ? "Clic en un nodo para eliminarlo. Pulsa el botón para salir."
            : deleteEdgeMode
            ? "Clic en una arista para eliminarla. Pulsa el botón para salir."
            : "Clic en un nodo y luego en otro (o el mismo) para conectar. Doble clic en nodo para renombrar; doble clic en arista para editar; clic derecho en arista para menú."}
        </span>
      </div>

      {/* Pizarra */}
      <svg
        ref={svgRef}
        className={`flex-1 border border-neutral-800 bg-neutral-950 rounded-md ${boardCursor}`}
        width="100%"
        height="100%"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleBoardClick}
      >
        {/* Marker de flecha (debe ir primero para asegurar visibilidad) */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 12 6, 0 12" fill={strokeColor} />
          </marker>
        </defs>

        {/* Aristas */}
        {edges.map((edge) => {
          const fromNode = nodes.find((n) => n.id === edge.from);
          const toNode = nodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;
          return renderEdgeGroup(edge, fromNode, toNode);
        })}

        {/* Nodos */}
        {nodes.map((node) => {
          // Texto adaptativo según longitud
          const fontSize = Math.max(10, Math.min(18, (NODE_RADIUS * 1.6) / Math.max(1, node.label.length)));

          return (
            <g
              key={node.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(node.id);
              }}
              onClick={(e) => handleNodeClick(node.id, e)}
              onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
              style={{ cursor: deleteNodeMode || deleteEdgeMode ? "not-allowed" : addMode ? "crosshair" : "grab" }}
            >
              <circle cx={node.x} cy={node.y} r={NODE_RADIUS} fill={nodeFill} stroke="#0b5566" strokeWidth={1} />
              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                className="font-semibold select-none pointer-events-none"
                style={{ fill: "#0a0a0a", fontSize: `${fontSize}px` }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Context menu para aristas */}
      {edgeMenu.visible && edgeMenu.edgeId && (
        <div
          className="absolute z-50 min-w-40 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-lg"
          style={{ top: edgeMenu.y, left: edgeMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left hover:bg-neutral-800"
            onClick={() => {
              const e = edges.find((x) => x.id === edgeMenu.edgeId);
              if (e) {
                setEditingEdge(e);
                setPendingEdge(null);
                setEdgeModalOpen(true);
              }
              setEdgeMenu((m) => ({ ...m, visible: false }));
            }}
          >
            Editar relación
          </button>
          <button
            className="w-full px-3 py-2 text-left text-red-300 hover:bg-neutral-800"
            onClick={() => {
              if (edgeMenu.edgeId) removeEdge(edgeMenu.edgeId);
              setEdgeMenu((m) => ({ ...m, visible: false }));
            }}
          >
            Eliminar relación
          </button>
        </div>
      )}
<AdjacencyMatrixModal
  isOpen={adjOpen}
  onClose={() => setAdjOpen(false)}
  nodes={nodes}
  edges={edges}
/>
<HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

{/* Modal: Exportar JSON con nombre */}
<Modal isOpen={exportOpen} onClose={() => setExportOpen(false)}>
  <ModalContent className="bg-neutral-900 text-neutral-100">
    <ModalHeader>Exportar JSON</ModalHeader>
    <ModalBody>
      <Input
        label="Nombre de archivo"
        labelPlacement="outside"
        placeholder={`graphroom-${nowStamp()}.json`}
        classNames={{ inputWrapper: "bg-neutral-800", label: "text-neutral-300" }}
        value={exportName}
        onChange={(e) => setExportName(e.target.value)}
        description={'No uses caracteres especiales como / \\\\ : * ? " < > |'}
      />
    </ModalBody>
    <ModalFooter>
      <Button variant="flat" onPress={() => setExportOpen(false)}>
        Cancelar
      </Button>
      <Button
        color="primary"
        onPress={() => {
          const fname = sanitizeFilename(exportName || `graphroom-${nowStamp()}.json`);
          exportJSON(fname);
          setExportOpen(false);
          setExportName("");
        }}
      >
        Exportar
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>

{/* Modal editar nodo */}
<Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
  <ModalContent className="bg-neutral-900 text-neutral-100">
    <ModalHeader>Editar Nodo</ModalHeader>
    <ModalBody>
      <Input
        label="Nombre"
        labelPlacement="outside"
        classNames={{ inputWrapper: "bg-neutral-800", label: "text-neutral-300" }}
        value={selectedNode?.label || ""}
        onChange={(e) =>
          setSelectedNode((prev) => (prev ? { ...prev, label: e.target.value } : prev))
        }
      />
    </ModalBody>
    <ModalFooter>
      <Button variant="flat" onPress={() => setModalOpen(false)}>
        Cancelar
      </Button>
      <Button color="primary" onPress={saveNodeName}>
        Guardar
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>



      {/* Modal arista (crear/editar) */}
      <EdgeModal
        isOpen={edgeModalOpen}
        pending={pendingEdge ?? undefined}
        existing={
          editingEdge
            ? {
                id: editingEdge.id,
                from: editingEdge.from,
                to: editingEdge.to,
                value: editingEdge.value,
                directed: editingEdge.directed,
              }
            : undefined
        }
        onClose={() => {
          setEdgeModalOpen(false);
          setPendingEdge(null);
          setEditingEdge(null);
        }}
        onCreate={handleCreateEdge}
        onSave={handleSaveEdge}
      />
      
    </div>
  );
}

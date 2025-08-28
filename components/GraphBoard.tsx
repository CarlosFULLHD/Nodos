"use client";
import React, { useState, useRef } from "react";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";

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

export default function GraphBoard() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [nodeCounter, setNodeCounter] = useState(1);

  // Modos
  const [addMode, setAddMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  // Arrastre
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  // Conexiones
  const [edgeStart, setEdgeStart] = useState<string | null>(null);

  // Modal de edición de nodo
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  /** Toggle modos */
  const toggleAddMode = () => {
    setAddMode((v) => !v);
    setDeleteMode(false); // no mezclar
    setEdgeStart(null);
    setDraggingNode(null);
  };

  const toggleDeleteMode = () => {
    setDeleteMode((v) => !v);
    setAddMode(false);
    setEdgeStart(null);
    setDraggingNode(null);
  };

  /** Click en pizarra: si addMode ON => crear nodo en coordenadas del clic */
  const handleBoardClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!addMode) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode: Node = {
      id: `${nodeCounter}`,
      x,
      y,
      label: `Nodo ${nodeCounter}`,
    };
    setNodes((prev) => [...prev, newNode]);
    setNodeCounter((prev) => prev + 1);
  };

  /** Iniciar arrastre (solo si no estamos en add/delete) */
  const handleMouseDown = (id: string) => {
    if (addMode || deleteMode) return;
    setDraggingNode(id);
  };

  /** Mover nodo */
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNode) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes((prev) => prev.map((n) => (n.id === draggingNode ? { ...n, x, y } : n)));
  };

  /** Soltar nodo */
  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  /** Click en nodo:
   *  - Si deleteMode ON => eliminar nodo
   *  - Si no, manejar lógica de conexión (clic-clic entre nodos)
   */
  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (deleteMode) {
      // Eliminar nodo y aristas asociadas
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((ed) => ed.from !== nodeId && ed.to !== nodeId));
      if (edgeStart === nodeId) setEdgeStart(null);
      return;
    }

    if (addMode) return; // en modo agregar, ignorar conexión

    // Crear conexión por clic entre nodos
    if (!edgeStart) {
      setEdgeStart(nodeId);
    } else {
      if (edgeStart !== nodeId) {
        const id = `${edgeStart}-${nodeId}-${Date.now()}`;
        setEdges((prev) => [
          ...prev,
          { id, from: edgeStart, to: nodeId, value: 1, directed: true },
        ]);
      }
      setEdgeStart(null);
    }
  };

  /** Doble clic en nodo => editar nombre (si no estamos en add/delete) */
  const handleNodeDoubleClick = (node: Node, e: React.MouseEvent) => {
    e.stopPropagation();
    if (addMode || deleteMode) return;
    setSelectedNode(node);
    setModalOpen(true);
  };

  /** Guardar cambios de nombre */
  const saveNodeName = () => {
    if (!selectedNode) return;
    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? selectedNode : n)));
    setModalOpen(false);
  };

  /** (Opcional) Estilos de cursor según modo */
  const boardCursor = addMode
    ? "cursor-crosshair"
    : deleteMode
    ? "cursor-no-drop"
    : draggingNode
    ? "cursor-grabbing"
    : "cursor-default";

  return (
    <div className="w-full h-[calc(100vh-96px)] flex flex-col items-stretch justify-start gap-3">
      {/* Toolbar */}
      <div className="px-2 flex items-center gap-2">
        <Button
          color={addMode ? "primary" : "default"}
          variant={addMode ? "solid" : "flat"}
          onPress={toggleAddMode}
        >
          {addMode ? "Agregar nodo: ON (clic en pizarra)" : "Agregar nodo"}
        </Button>

        <Button
          color={deleteMode ? "danger" : "default"}
          variant={deleteMode ? "solid" : "flat"}
          onPress={toggleDeleteMode}
        >
          {deleteMode ? "Eliminar nodo: ON" : "Eliminar nodo"}
        </Button>

        {/* Hint de estado */}
        <span className="text-xs text-gray-500 ml-2">
          {edgeStart
            ? `Selecciona un nodo destino para conectar desde ${edgeStart}…`
            : addMode
            ? "Clic en la pizarra para crear nodos. Pulsa el botón para salir."
            : deleteMode
            ? "Clic en un nodo para eliminarlo. Pulsa el botón para salir."
            : "Clic en un nodo y luego en otro para conectar. Doble clic en un nodo para renombrar."}
        </span>
      </div>

      {/* Pizarra */}
      <svg
        ref={svgRef}
        className={`flex-1 border border-gray-300 bg-white rounded-md ${boardCursor}`}
        width="100%"
        height="100%"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleBoardClick}
      >
        {/* Aristas */}
        {edges.map((edge) => {
          const fromNode = nodes.find((n) => n.id === edge.from);
          const toNode = nodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          return (
            <g key={edge.id}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="black"
                strokeWidth={2}
                markerEnd={edge.directed ? "url(#arrowhead)" : undefined}
              />
              <text
                x={(fromNode.x + toNode.x) / 2}
                y={(fromNode.y + toNode.y) / 2 - 5}
                textAnchor="middle"
                className="text-[10px] select-none"
              >
                {edge.value}
              </text>
            </g>
          );
        })}

        {/* Flecha para conexiones dirigidas */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="black" />
          </marker>
        </defs>

        {/* Nodos */}
        {nodes.map((node) => (
          <g
            key={node.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(node.id);
            }}
            onClick={(e) => handleNodeClick(node.id, e)}
            onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
            style={{ cursor: deleteMode ? "not-allowed" : addMode ? "crosshair" : "grab" }}
          >
            <circle cx={node.x} cy={node.y} r={25} fill="#57c3d1" />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="fill-white font-semibold select-none pointer-events-none"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Modal editar nodo */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Editar Nodo</ModalHeader>
          <ModalBody>
            <Input
              label="Nombre"
              value={selectedNode?.label || ""}
              onChange={(e) =>
                setSelectedNode((prev) => (prev ? { ...prev, label: e.target.value } : prev))
              }
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="primary" onPress={saveNodeName}>
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

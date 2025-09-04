"use client";
import React, { useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

type NodeT = { id: string; x: number; y: number; label: string };
type EdgeT = { id: string; from: string; to: string; value: number; directed: boolean };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeT[];
  edges: EdgeT[];
}

function numericFirstSort(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  const aIsNum = Number.isFinite(na);
  const bIsNum = Number.isFinite(nb);
  if (aIsNum && bIsNum) return na - nb;
  if (aIsNum && !bIsNum) return -1;
  if (!aIsNum && bIsNum) return 1;
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

const displayName = (n: NodeT) => (n.label?.trim() ? n.label : n.id);

export default function AdjacencyMatrixModal({ isOpen, onClose, nodes, edges }: Props) {
  const orderedNodes = useMemo(() => {
    const copy = [...nodes];
    copy.sort((n1, n2) => numericFirstSort(n1.id, n2.id));
    return copy;
  }, [nodes]);

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    orderedNodes.forEach((n, idx) => map.set(n.id, idx));
    return map;
  }, [orderedNodes]);

  const matrix = useMemo(() => {
    const n = orderedNodes.length;
    const m = Array.from({ length: n }, () => Array<number>(n).fill(0));
    for (const e of edges) {
      const i = indexById.get(e.from);
      const j = indexById.get(e.to);
      if (i == null || j == null) continue;
      const w = Math.max(0, Math.trunc(Number.isFinite(e.value) ? e.value : 0));
      if (e.directed) {
        m[i][j] += w;
      } else {
        m[i][j] += w;
        m[j][i] += w;
      }
    }
    return m;
  }, [edges, indexById, orderedNodes]);

  const size = orderedNodes.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalContent className="bg-neutral-900 text-neutral-100">
        <ModalHeader className="flex flex-col gap-1">
          Matriz de adyacencia
          <span className="text-xs text-neutral-400">Tamaño: {size} × {size}</span>
        </ModalHeader>

        <ModalBody>
          {size === 0 ? (
            <div className="text-neutral-400 text-sm">No hay nodos para mostrar.</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-md border border-neutral-800">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-neutral-900">
                  <tr>
                    <th className="border border-neutral-800 px-2 py-1 text-xs text-neutral-300 sticky left-0 bg-neutral-900 z-10">
                      —
                    </th>
                    {orderedNodes.map((n) => (
                      <th
                        key={`col-${n.id}`}
                        title={`${n.label} (id: ${n.id})`}
                        className="border border-neutral-800 px-2 py-1 text-xs text-neutral-300"
                      >
                        {displayName(n)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedNodes.map((rowNode, i) => (
                    <tr key={`row-${rowNode.id}`}>
                      <th
                        className="border border-neutral-800 px-2 py-1 text-xs text-neutral-300 sticky left-0 bg-neutral-900 z-10"
                        title={`${rowNode.label} (id: ${rowNode.id})`}
                      >
                        {displayName(rowNode)}
                      </th>
                      {matrix[i].map((val, j) => (
                        <td
                          key={`cell-${i}-${j}`}
                          className="border border-neutral-800 px-2 py-1 text-center text-sm text-neutral-100"
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

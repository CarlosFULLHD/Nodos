// components/EdgeModal.tsx
"use client";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Switch,
  Button,
} from "@heroui/react";

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  value: number;
  directed: boolean;
}

interface EdgeModalProps {
  isOpen: boolean;
  edge: EdgeData | null;
  onClose: () => void;
  onSave: (edge: EdgeData) => void;
  onDelete?: (edgeId: string) => void;
}

export default function EdgeModal({
  isOpen,
  edge,
  onClose,
  onSave,
  onDelete,
}: EdgeModalProps) {
  const [value, setValue] = useState<number>(1);
  const [directed, setDirected] = useState<boolean>(true);

  useEffect(() => {
    if (edge) {
      setValue(edge.value ?? 1);
      setDirected(!!edge.directed);
    }
  }, [edge]);

  if (!edge) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Editar conexión</ModalHeader>
        <ModalBody className="space-y-3">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Desde:</span> {edge.from} &nbsp;·&nbsp;
            <span className="font-medium text-gray-700">Hacia:</span> {edge.to}
          </div>

          <Input
            type="number"
            label="Valor (peso)"
            value={String(value)}
            onChange={(e) => setValue(Number(e.target.value || 0))}
            min={0}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Conexión dirigida (flecha)</span>
            <Switch isSelected={directed} onValueChange={setDirected} />
          </div>
        </ModalBody>

        <ModalFooter className="justify-between">
          <Button
            color="danger"
            variant="flat"
            onPress={() => {
              if (onDelete) onDelete(edge.id);
              onClose();
            }}
          >
            Eliminar
          </Button>

          <div className="space-x-2">
            <Button variant="light" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={() => {
                onSave({ ...edge, value, directed });
                onClose();
              }}
            >
              Guardar
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

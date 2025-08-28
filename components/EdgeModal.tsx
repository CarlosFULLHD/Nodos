"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  RadioGroup,
  Radio,
} from "@heroui/react";

export type EdgeDirection = "forward" | "undirected" | "reverse";

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  value: number;
  directed: boolean;
}
interface PendingEdge { from: string; to: string; }

interface EdgeModalProps {
  isOpen: boolean;
  pending?: PendingEdge | null;
  existing?: EdgeData | null;
  onClose: () => void;
  onCreate?: (edge: { from: string; to: string; value: number; direction: EdgeDirection }) => void;
  onSave?:   (edge: { id: string; from: string; to: string; value: number; direction: EdgeDirection }) => void;
}

export default function EdgeModal({
  isOpen, pending, existing, onClose, onCreate, onSave,
}: EdgeModalProps) {
  const isEditing = !!existing;
  const [valueStr, setValueStr] = useState<string>("1");
  const [direction, setDirection] = useState<EdgeDirection>("forward");
  const [invalid, setInvalid] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && existing) {
      setValueStr(String(Math.max(0, Math.trunc(existing.value ?? 1))));
      setDirection(existing.directed ? "forward" : "undirected");
      setInvalid(null);
    } else {
      setValueStr("1");
      setDirection("forward");
      setInvalid(null);
    }
  }, [isEditing, existing, isOpen]);

  const title = useMemo(() => (isEditing ? "Editar conexión" : "Nueva conexión"), [isEditing]);

  const subtitle = useMemo(() => {
    const a = isEditing ? existing?.from : pending?.from;
    const b = isEditing ? existing?.to : pending?.to;
    if (!a || !b) return null;
    return (
      <span className="text-sm text-neutral-400">
        <span className="font-medium text-neutral-200">Desde:</span> {a} &nbsp;·&nbsp;
        <span className="font-medium text-neutral-200">Hacia:</span> {b}
      </span>
    );
  }, [isEditing, existing, pending]);

  const onlyDigits = (s: string) => /^\d*$/.test(s);
  const handleChange = (s: string) => {
    if (!onlyDigits(s)) return;
    setValueStr(s);
    if (s === "") setInvalid("Ingrese solo números (0, 1, 2, ...).");
    else setInvalid(null);
  };
  const numericValue = () => {
    const n = Number(valueStr || "0");
    return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
  };
  const confirm = () => {
    if (valueStr === "" || !onlyDigits(valueStr)) {
      setInvalid("Ingrese solo números (0, 1, 2, ...).");
      return;
    }
    const v = numericValue();
    if (v < 0) {
      setInvalid("El valor no puede ser negativo.");
      return;
    }
    if (isEditing && existing && onSave) {
      onSave({ id: existing.id, from: existing.from, to: existing.to, value: v, direction });
      onClose();
      return;
    }
    if (!isEditing && pending && onCreate) {
      onCreate({ from: pending.from, to: pending.to, value: v, direction });
      onClose();
    }
  };
  const blockKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const bad = ["e", "E", "+", "-", ".", ",", " "];
    if (bad.includes(e.key)) e.preventDefault();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent className="bg-neutral-900 text-neutral-100">
        <ModalHeader className="flex flex-col gap-1">{title}{subtitle}</ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            label="Peso (entero ≥ 0)"
            labelPlacement="outside"
            classNames={{ inputWrapper: "bg-neutral-800", label: "text-neutral-300" }}
            value={valueStr}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={blockKeys}
            errorMessage={invalid ?? undefined}
            isInvalid={!!invalid}
            placeholder="1"
          />
          <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-200">Dirección</div>
            <RadioGroup
              orientation="vertical"
              value={direction}
              onValueChange={(v) => setDirection(v as EdgeDirection)}
            >
              <Radio value="forward">De A → B (por defecto)</Radio>
              <Radio value="undirected">Sin dirección (no muestra flecha)</Radio>
              <Radio value="reverse">Invertida (B → A)</Radio>
            </RadioGroup>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Cancelar</Button>
          <Button color="primary" onPress={confirm}>Guardar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

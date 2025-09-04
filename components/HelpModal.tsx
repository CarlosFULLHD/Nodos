"use client";
import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent className="bg-neutral-900 text-neutral-100">
        <ModalHeader className="flex flex-col gap-1">
          Guía rápida de uso
          <span className="text-xs text-neutral-400">Cómo crear, conectar y gestionar el grafo</span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-200">Crear y mover nodos</h3>
            <ul className="list-disc pl-5 text-sm text-neutral-300 space-y-1">
              <li>
                <span className="font-medium">Agregar nodo</span>: pulsa el botón <em>“Agregar nodo”</em> para
                activar el modo. Luego haz clic en la pizarra para colocar el nodo. Desactiva el modo volviendo a
                pulsar el botón.
              </li>
              <li>
                <span className="font-medium">Mover</span>: fuera de los modos de agregar/eliminar, mantén
                presionado el botón y arrastra el nodo.
              </li>
              <li>
                <span className="font-medium">Renombrar</span>: doble clic sobre un nodo abre el modal para
                cambiar su nombre.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-200">Crear y editar relaciones (aristas)</h3>
            <ul className="list-disc pl-5 text-sm text-neutral-300 space-y-1">
              <li>
                <span className="font-medium">Crear relación</span>: haz clic en un nodo origen y después en un nodo
                destino (puede ser el mismo para crear un <em>self-loop</em>). Se abrirá un modal para indicar el
                <em> peso</em> (entero ≥ 0) y la <em>dirección</em> (A→B, sin dirección, o invertida).
              </li>
              <li>
                <span className="font-medium">Editar relación</span>: doble clic sobre una arista abre el modal para
                cambiar peso/dirección. También puedes hacer clic derecho sobre una arista y elegir “Editar relación”.
              </li>
              <li>
                <span className="font-medium">Eliminar relación</span>: activa “Eliminar relación: ON” y haz clic en la
                arista, o clic derecho &gt; “Eliminar relación”.
              </li>
              <li>
                Las flechas se dibujan fuera del nodo para que la dirección sea visible; si existen A→B y B→A, se
                curvan en lados opuestos para evitar solaparse.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-200">Eliminar nodos</h3>
            <ul className="list-disc pl-5 text-sm text-neutral-300 space-y-1">
              <li>
                Activa “Eliminar nodo: ON” y haz clic en el nodo. Se borrará el nodo y todas sus relaciones.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-200">Importar / Exportar / Matriz</h3>
            <ul className="list-disc pl-5 text-sm text-neutral-300 space-y-1">
              <li>
                <span className="font-medium">Exportar JSON</span>: abre el modal, asigna un nombre y descarga el grafo
                en formato <code className="bg-neutral-800 px-1 py-0.5 rounded">{"{ nodes, edges }"}</code>.
              </li>
              <li>
                <span className="font-medium">Importar JSON</span>: selecciona un archivo válido y se cargará el grafo.
              </li>
              <li>
                <span className="font-medium">Matriz de adyacencia</span>: muestra una matriz N×N (dirigidas suman en
                [i][j]; no dirigidas suman en [i][j] y [j][i]; self-loops en la diagonal).
              </li>
              <li>
                <span className="font-medium">Limpiar</span>: borra todos los nodos y relaciones.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-200">Atajos y tips</h3>
            <ul className="list-disc pl-5 text-sm text-neutral-300 space-y-1">
              <li>Doble clic en nodo = renombrar.</li>
              <li>Doble clic en arista = editar.</li>
              <li>Clic derecho en arista = menú contextual (editar / eliminar).</li>
              <li>Mientras agregas nodos, haz clic en el lienzo para colocarlos rápidamente.</li>
            </ul>
          </section>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

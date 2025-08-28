// app/page.tsx
import React from "react";
import GraphBoard from "@/components/GraphBoard";

export const metadata = {
  title: "Graph Room",
  description: "Pizarra de nodos y conexiones estilo GraphOnline",
};

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-gray-50">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-5 py-3">
        <h1 className="text-xl font-semibold tracking-tight">Graph Room</h1>
        <p className="text-sm text-gray-500">
          Doble clic en un nodo para renombrarlo • Clic en un nodo para iniciar/terminar conexión
        </p>
      </header>

      {/* Tu pizarra SVG */}
      <section className="px-4 py-4">
        <GraphBoard />
      </section>

      <footer className="border-t bg-white px-5 py-3 text-center text-xs text-gray-500">
        Hecho con React + Next.js + HeroUI + SVG
      </footer>
    </main>
  );
}

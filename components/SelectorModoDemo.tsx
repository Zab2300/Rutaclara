"use client";

import { useModoDemo, type RolDemo } from "./ModoDemoContext";

const OPCIONES: { rol: RolDemo; etiqueta: string }[] = [
  { rol: "transportador", etiqueta: "Transportador" },
  { rol: "publicador", etiqueta: "Publicador" },
];

/** Selector simple de modo demo — reemplaza el login en el prototipo. */
export default function SelectorModoDemo() {
  const { rol, setRol } = useModoDemo();

  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
      <span className="pl-2 pr-1 text-xs font-bold text-slate-400">MODO DEMO</span>
      {OPCIONES.map((opcion) => (
        <button
          key={opcion.rol}
          type="button"
          onClick={() => setRol(opcion.rol)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
            rol === opcion.rol ? "bg-rc-azul text-white" : "text-slate-500"
          }`}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}

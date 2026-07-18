"use client";

import { obtenerTipologiasParaPasajeros } from "@/lib/tarifas";
import { ICONO_TIPOLOGIA } from "@/lib/iconos";
import type { TipologiaId } from "@/lib/tipos";

interface Props {
  pasajeros: number;
  seleccionada: TipologiaId | null;
  onSeleccionar: (id: TipologiaId) => void;
}

export default function SelectorTipologia({ pasajeros, seleccionada, onSeleccionar }: Props) {
  const opciones = obtenerTipologiasParaPasajeros(pasajeros);

  if (pasajeros <= 0) return null;

  if (opciones.length === 0) {
    return (
      <p className="rounded-xl bg-rc-amarillo-claro p-4 text-base text-slate-700">
        No tenemos una tipología para {pasajeros} pasajeros en el prototipo. Prueba con un número
        menor.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-500">
        VEHÍCULOS QUE CUMPLEN PARA {pasajeros} PASAJEROS
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {opciones.map((tipologia) => {
          const activa = seleccionada === tipologia.id;
          return (
            <button
              key={tipologia.id}
              type="button"
              onClick={() => onSeleccionar(tipologia.id)}
              className={`btn-grande flex flex-col items-center justify-center gap-1 border-2 p-3 text-center ${
                activa
                  ? "border-rc-azul bg-rc-azul text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              aria-pressed={activa}
            >
              <span className="text-3xl leading-none" aria-hidden="true">
                {ICONO_TIPOLOGIA[tipologia.id]}
              </span>
              <span className="text-sm font-bold leading-tight">{tipologia.nombre}</span>
              <span className={`text-xs ${activa ? "text-white/80" : "text-slate-400"}`}>
                hasta {tipologia.capacidad} pax
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

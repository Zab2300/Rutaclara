"use client";

import { useState } from "react";
import FormularioPublicarServicio, {
  type DatosNuevoServicio,
} from "./FormularioPublicarServicio";
import { formatoMoneda } from "@/lib/tarifas";
import { ICONO_TIPOLOGIA } from "@/lib/iconos";
import { linkWhatsApp, mensajeServicio } from "@/lib/whatsapp";
import type { EstadoServicio, Publicador, Servicio } from "@/lib/tipos";

const ESTILO_ESTADO: Record<EstadoServicio, string> = {
  Publicado: "bg-rc-azul-claro text-white",
  Tomado: "bg-rc-naranja text-white",
  "En curso": "bg-rc-amarillo text-white",
  Completado: "bg-slate-400 text-white",
  "Pago confirmado": "bg-rc-verde text-white",
};

interface Props {
  servicios: Servicio[];
  publicador: Publicador;
  mostrarFormularioInicial?: boolean;
  valoresIniciales?: {
    origen?: string;
    destino?: string;
    fecha?: string;
    hora?: string;
    pasajeros?: number;
    tipologia?: Servicio["tipologia"];
    valorSugerido?: number;
  };
  onPublicar: (datos: DatosNuevoServicio) => void;
}

export default function VistaPublicador({
  servicios,
  publicador,
  mostrarFormularioInicial,
  valoresIniciales,
  onPublicar,
}: Props) {
  const [mostrarFormulario, setMostrarFormulario] = useState(Boolean(mostrarFormularioInicial));
  const [ultimoPublicado, setUltimoPublicado] = useState<DatosNuevoServicio | null>(null);

  const misServicios = servicios
    .filter((s) => s.publicadorId === publicador.id)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  function manejarPublicar(datos: DatosNuevoServicio) {
    onPublicar(datos);
    setUltimoPublicado(datos);
    setMostrarFormulario(false);
  }

  return (
    <div>
      {!mostrarFormulario && (
        <button
          type="button"
          onClick={() => {
            setUltimoPublicado(null);
            setMostrarFormulario(true);
          }}
          className="btn-grande mb-5 w-full bg-rc-verde text-xl text-white"
        >
          + PUBLICAR SERVICIO
        </button>
      )}

      {mostrarFormulario && (
        <div className="mb-5">
          <FormularioPublicarServicio
            valoresIniciales={valoresIniciales}
            onCancelar={() => setMostrarFormulario(false)}
            onPublicar={manejarPublicar}
          />
        </div>
      )}

      {ultimoPublicado && (
        <div className="mb-5 space-y-3 rounded-2xl border border-rc-verde bg-rc-verde-claro p-4">
          <p className="text-base font-bold text-rc-azul">
            ✅ Servicio publicado. Ahora compártelo donde el gremio lo va a ver.
          </p>
          <a
            href={linkWhatsApp(mensajeServicio(ultimoPublicado))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-grande flex w-full items-center justify-center bg-rc-verde text-lg text-white"
          >
            COMPARTIR EN EL GRUPO DE WHATSAPP
          </a>
        </div>
      )}

      <h2 className="mb-3 text-lg font-extrabold text-rc-azul">Mis servicios publicados</h2>

      {misServicios.length === 0 && (
        <p className="rounded-xl bg-slate-100 p-4 text-center text-base text-slate-500">
          Todavía no has publicado servicios.
        </p>
      )}

      <div className="space-y-2">
        {misServicios.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-slate-800">
                <span aria-hidden="true">{ICONO_TIPOLOGIA[s.tipologia]}</span> {s.origen} → {s.destino}
              </p>
              <p className="text-sm text-slate-500">
                {s.fecha} · {s.hora} · {formatoMoneda(s.valor)}
              </p>
            </div>
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${ESTILO_ESTADO[s.estado]}`}
            >
              {s.estado}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

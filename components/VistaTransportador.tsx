"use client";

import { useMemo, useState } from "react";
import TarjetaServicio from "./TarjetaServicio";
import { TARIFAS_KM, formatoMoneda } from "@/lib/tarifas";
import { ICONO_TIPOLOGIA } from "@/lib/iconos";
import type { Publicador, Servicio, TipologiaId } from "@/lib/tipos";

interface Props {
  servicios: Servicio[];
  publicadoresPorId: Record<string, Publicador>;
  yaPostulado: Set<string>;
  onConfirmarToma: (servicioId: string) => void;
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border-2 px-3.5 py-2 text-sm font-bold ${
        activo ? "border-rc-azul bg-rc-azul text-white" : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

export default function VistaTransportador({
  servicios,
  publicadoresPorId,
  yaPostulado,
  onConfirmarToma,
}: Props) {
  const [filtroTipologia, setFiltroTipologia] = useState<TipologiaId | null>(null);
  const [filtroZona, setFiltroZona] = useState<string | null>(null);
  const [servicioAConfirmar, setServicioAConfirmar] = useState<Servicio | null>(null);
  const [servicioConfirmado, setServicioConfirmado] = useState<Servicio | null>(null);

  const disponibles = useMemo(
    () => servicios.filter((s) => s.estado === "Publicado"),
    [servicios]
  );

  const tipologiasPresentes = useMemo(() => {
    const ids = Array.from(new Set(disponibles.map((s) => s.tipologia)));
    return ids.map((id) => TARIFAS_KM[id]);
  }, [disponibles]);

  const zonasPresentes = useMemo(
    () => Array.from(new Set(disponibles.map((s) => s.zona))),
    [disponibles]
  );

  const listaFiltrada = disponibles.filter((s) => {
    if (filtroTipologia && s.tipologia !== filtroTipologia) return false;
    if (filtroZona && s.zona !== filtroZona) return false;
    return true;
  });

  function manejarConfirmar() {
    if (!servicioAConfirmar) return;
    onConfirmarToma(servicioAConfirmar.id);
    setServicioConfirmado(servicioAConfirmar);
    setServicioAConfirmar(null);
  }

  return (
    <div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <Chip activo={filtroTipologia === null} onClick={() => setFiltroTipologia(null)}>
          Todos
        </Chip>
        {tipologiasPresentes.map((t) => (
          <Chip
            key={t.id}
            activo={filtroTipologia === t.id}
            onClick={() => setFiltroTipologia(filtroTipologia === t.id ? null : t.id)}
          >
            {ICONO_TIPOLOGIA[t.id]} {t.nombre.split(" (")[0]}
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Chip activo={filtroZona === null} onClick={() => setFiltroZona(null)}>
          Toda zona
        </Chip>
        {zonasPresentes.map((zona) => (
          <Chip
            key={zona}
            activo={filtroZona === zona}
            onClick={() => setFiltroZona(filtroZona === zona ? null : zona)}
          >
            {zona}
          </Chip>
        ))}
      </div>

      {listaFiltrada.length === 0 && (
        <p className="rounded-xl bg-slate-100 p-4 text-center text-base text-slate-500">
          No hay servicios que cumplan estos filtros ahora mismo.
        </p>
      )}

      <div className="space-y-3">
        {listaFiltrada.map((servicio) => (
          <TarjetaServicio
            key={servicio.id}
            servicio={servicio}
            publicador={publicadoresPorId[servicio.publicadorId]}
            postulado={yaPostulado.has(servicio.id)}
            onTomar={() => setServicioAConfirmar(servicio)}
          />
        ))}
      </div>

      {/* Toque 1 ya ocurrió (abrir esta confirmación). Toque 2 = botón CONFIRMAR. */}
      {servicioAConfirmar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <h3 className="mb-3 text-xl font-extrabold text-rc-azul">Confirmar servicio</h3>
            <div className="mb-4 space-y-1 rounded-xl bg-slate-50 p-4">
              <p className="text-lg font-bold text-slate-800">
                {servicioAConfirmar.origen} → {servicioAConfirmar.destino}
              </p>
              <p className="text-sm text-slate-500">
                {TARIFAS_KM[servicioAConfirmar.tipologia].nombre} · {servicioAConfirmar.pasajeros} pax
              </p>
              <p className="text-sm text-slate-500">
                {servicioAConfirmar.fecha} · {servicioAConfirmar.hora}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-rc-verde">
                {formatoMoneda(servicioAConfirmar.valor)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setServicioAConfirmar(null)}
                className="btn-grande flex-1 border-2 border-slate-300 bg-white text-slate-600"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={manejarConfirmar}
                className="btn-grande flex-1 bg-rc-naranja text-lg text-white"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {servicioConfirmado && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 text-center sm:rounded-2xl">
            <div className="mb-2 text-5xl" aria-hidden="true">
              ✅
            </div>
            <h3 className="mb-1 text-xl font-extrabold text-rc-verde">
              {servicioConfirmado.modoAsignacion === "RAPIDO"
                ? "¡Servicio tomado!"
                : "¡Postulación enviada!"}
            </h3>
            <p className="mb-4 text-base text-slate-500">
              {servicioConfirmado.modoAsignacion === "RAPIDO"
                ? "Contacta al publicador para coordinar los detalles."
                : "El publicador elegirá entre las postulaciones en los próximos 15 minutos."}
            </p>
            <div className="mb-5 rounded-xl bg-slate-50 p-4 text-left">
              <p className="text-sm font-bold text-slate-500">PUBLICADOR</p>
              <p className="text-lg font-bold text-slate-800">
                {publicadoresPorId[servicioConfirmado.publicadorId]?.nombre}
              </p>
              <p className="text-base text-slate-600">
                📞 {publicadoresPorId[servicioConfirmado.publicadorId]?.telefonoSimulado}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-500">ESTADO DEL SERVICIO</p>
              <p className="text-base font-semibold text-rc-azul">
                {servicioConfirmado.modoAsignacion === "RAPIDO" ? "Tomado" : "Publicado (postulado)"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setServicioConfirmado(null)}
              className="btn-grande w-full bg-rc-azul text-lg text-white"
            >
              LISTO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

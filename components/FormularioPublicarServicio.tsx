"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import SelectorTipologia from "./SelectorTipologia";
import { calcularCotizacion, formatoMoneda } from "@/lib/tarifas";
import { MUNICIPIOS, obtenerDistanciaSync } from "@/lib/distancias";
import type { ModoAsignacion, TipologiaId } from "@/lib/tipos";

export interface DatosNuevoServicio {
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  pasajeros: number;
  tipologia: TipologiaId;
  valor: number;
  modoAsignacion: ModoAsignacion;
  observaciones: string;
}

interface ValoresIniciales {
  origen?: string;
  destino?: string;
  fecha?: string;
  hora?: string;
  pasajeros?: number;
  tipologia?: TipologiaId;
  valorSugerido?: number;
}

const EXPLICACION_MODO: Record<ModoAsignacion, { titulo: string; texto: string }> = {
  RAPIDO: { titulo: "RÁPIDO", texto: "El primero que lo tome se lo lleva." },
  SELECCION: { titulo: "SELECCIÓN", texto: "Recibe postulaciones 15 minutos y elige." },
  DIRECTO: { titulo: "DIRECTO", texto: "Asígnalo a uno de tus favoritos." },
};

interface Props {
  valoresIniciales?: ValoresIniciales;
  onCancelar: () => void;
  onPublicar: (datos: DatosNuevoServicio) => void;
}

export default function FormularioPublicarServicio({
  valoresIniciales,
  onCancelar,
  onPublicar,
}: Props) {
  const [origen, setOrigen] = useState(valoresIniciales?.origen ?? "Medellín");
  const [destino, setDestino] = useState(valoresIniciales?.destino ?? "");
  const [fecha, setFecha] = useState(valoresIniciales?.fecha ?? "");
  const [hora, setHora] = useState(valoresIniciales?.hora ?? "08:00");
  const [pasajeros, setPasajeros] = useState<number>(valoresIniciales?.pasajeros ?? 0);
  const [tipologia, setTipologia] = useState<TipologiaId | null>(
    valoresIniciales?.tipologia ?? null
  );
  const [observaciones, setObservaciones] = useState("");
  const [modoAsignacion, setModoAsignacion] = useState<ModoAsignacion>("RAPIDO");

  const [valor, setValor] = useState<string>(
    valoresIniciales?.valorSugerido ? String(valoresIniciales.valorSugerido) : ""
  );
  const [valorEditadoManualmente, setValorEditadoManualmente] = useState(
    Boolean(valoresIniciales?.valorSugerido)
  );

  const tarifaSugerida = useMemo(() => {
    if (!origen || !destino || !tipologia) return null;
    const distancia = obtenerDistanciaSync(origen, destino);
    if (!distancia) return null;
    return calcularCotizacion({
      origen,
      destino,
      kmIda: distancia.km,
      peajeIda: distancia.peaje,
      tipologia,
      horaInicio: hora,
    });
  }, [origen, destino, tipologia, hora]);

  // Si el valor no fue tocado a mano, lo seguimos actualizando con la sugerencia.
  useEffect(() => {
    if (!valorEditadoManualmente && tarifaSugerida) {
      setValor(String(tarifaSugerida.total));
    }
  }, [tarifaSugerida, valorEditadoManualmente]);

  const valorNumerico = Number(valor) || 0;
  const publicandoPorDebajo =
    tarifaSugerida !== null && valorNumerico > 0 && valorNumerico < tarifaSugerida.total * 0.85;

  const formularioCompleto = Boolean(
    origen && destino && fecha && hora && pasajeros > 0 && tipologia && valorNumerico > 0
  );

  function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formularioCompleto || !tipologia) return;
    onPublicar({
      origen,
      destino,
      fecha,
      hora,
      pasajeros,
      tipologia,
      valor: valorNumerico,
      modoAsignacion,
      observaciones,
    });
  }

  return (
    <form
      onSubmit={manejarSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-tarjeta"
    >
      <h2 className="text-lg font-extrabold text-rc-azul">PUBLICAR SERVICIO</h2>

      <div>
        <label htmlFor="pub-origen" className="mb-1 block text-sm font-bold text-slate-600">
          ORIGEN
        </label>
        <input
          id="pub-origen"
          list="municipios-pub"
          value={origen}
          onChange={(e) => setOrigen(e.target.value)}
          className="btn-grande w-full border border-slate-300 px-4 text-lg"
        />
      </div>

      <div>
        <label htmlFor="pub-destino" className="mb-1 block text-sm font-bold text-slate-600">
          DESTINO
        </label>
        <input
          id="pub-destino"
          list="municipios-pub"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          className="btn-grande w-full border border-slate-300 px-4 text-lg"
          placeholder="Ej: Guatapé"
        />
      </div>
      <datalist id="municipios-pub">
        {MUNICIPIOS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pub-fecha" className="mb-1 block text-sm font-bold text-slate-600">
            FECHA
          </label>
          <input
            id="pub-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="btn-grande w-full border border-slate-300 px-3 text-base"
          />
        </div>
        <div>
          <label htmlFor="pub-hora" className="mb-1 block text-sm font-bold text-slate-600">
            HORA
          </label>
          <input
            id="pub-hora"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="btn-grande w-full border border-slate-300 px-3 text-base"
          />
        </div>
      </div>

      <div>
        <label htmlFor="pub-pasajeros" className="mb-1 block text-sm font-bold text-slate-600">
          PASAJEROS
        </label>
        <input
          id="pub-pasajeros"
          type="number"
          min={1}
          max={45}
          inputMode="numeric"
          value={pasajeros || ""}
          onChange={(e) => {
            setPasajeros(Number(e.target.value));
            setTipologia(null);
          }}
          className="btn-grande w-full border border-slate-300 px-4 text-lg"
        />
      </div>

      <SelectorTipologia pasajeros={pasajeros} seleccionada={tipologia} onSeleccionar={setTipologia} />

      <div>
        <label htmlFor="pub-observaciones" className="mb-1 block text-sm font-bold text-slate-600">
          OBSERVACIONES (OPCIONAL)
        </label>
        <textarea
          id="pub-observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-300 p-3 text-base"
          placeholder="Ej: punto de encuentro, equipaje, requisitos especiales..."
        />
      </div>

      <div>
        <label htmlFor="pub-valor" className="mb-1 block text-sm font-bold text-slate-600">
          VALOR DEL SERVICIO
        </label>
        {tarifaSugerida && (
          <p className="mb-1 text-sm text-slate-500">
            Tarifa de referencia del mercado: <strong>{formatoMoneda(tarifaSugerida.total)}</strong>
          </p>
        )}
        <input
          id="pub-valor"
          type="number"
          inputMode="numeric"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setValorEditadoManualmente(true);
          }}
          className="btn-grande w-full border border-slate-300 px-4 text-lg"
        />
        {publicandoPorDebajo && (
          <p className="mt-2 rounded-xl bg-rc-naranja-claro px-3 py-2 text-sm font-semibold text-rc-naranja">
            ⚠ Estás publicando por debajo de la tarifa del gremio.
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-slate-600">MODO DE ASIGNACIÓN</p>
        <div className="space-y-2">
          {(Object.keys(EXPLICACION_MODO) as ModoAsignacion[]).map((modo) => {
            const info = EXPLICACION_MODO[modo];
            const activo = modoAsignacion === modo;
            return (
              <button
                key={modo}
                type="button"
                onClick={() => setModoAsignacion(modo)}
                className={`btn-grande flex w-full items-center justify-between border-2 px-4 text-left ${
                  activo ? "border-rc-azul bg-rc-azul text-white" : "border-slate-200 bg-white"
                }`}
                aria-pressed={activo}
              >
                <span className="font-bold">{info.titulo}</span>
                <span className={`text-sm ${activo ? "text-white/90" : "text-slate-500"}`}>
                  {info.texto}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="btn-grande flex-1 border-2 border-slate-300 bg-white text-slate-600"
        >
          CANCELAR
        </button>
        <button
          type="submit"
          disabled={!formularioCompleto}
          className="btn-grande flex-1 bg-rc-verde text-lg text-white disabled:opacity-40"
        >
          PUBLICAR
        </button>
      </div>
    </form>
  );
}

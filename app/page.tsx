"use client";

/**
 * Página 1 — Cotizador público (ruta "/").
 * Puerta de entrada de la app: sin registro, cotiza en 30 segundos.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import SelectorTipologia from "@/components/SelectorTipologia";
import DesgloseCotizacion from "@/components/DesgloseCotizacion";
import {
  calcularCotizacion,
  calcularDiasContratados,
  calcularHorasContratadas,
  HORAS_MINIMAS,
  RECARGO_FIN_DE_SEMANA_FESTIVO,
} from "@/lib/tarifas";
import { MUNICIPIOS, obtenerDistanciaSync, estimarDistanciaManual } from "@/lib/distancias";
import { mensajeCotizacion, linkWhatsApp } from "@/lib/whatsapp";
import { consultarFestivo, esFinDeSemana } from "@/lib/festivos";
import { buscarEventoAplicable } from "@/lib/eventos";
import { detectarRestriccion } from "@/lib/direcciones";
import type { Cotizacion, TipoServicio, TipologiaId } from "@/lib/tipos";

const TIPOS_SERVICIO: { id: TipoServicio; etiqueta: string; texto: string }[] = [
  { id: "trayecto", etiqueta: "Trayecto", texto: "Origen y destino, un solo sentido (sin regreso incluido)" },
  {
    id: "trayecto_ida_regreso",
    etiqueta: "Trayecto ida y regreso",
    texto: "Origen y destino, el vehículo regresa",
  },
  { id: "dia_sol", etiqueta: "Día de sol", texto: "Jornada completa en la ciudad, mínimo 9 horas" },
  {
    id: "por_horas",
    etiqueta: "Servicio por horas",
    texto: "Vehículo por horas en una zona, mínimo 4 horas",
  },
  {
    id: "disponibilidad_completa",
    etiqueta: "Disponibilidad completa",
    texto: "Vehículo disponible varios días para distintos recorridos",
  },
];

export default function PaginaCotizador() {
  const router = useRouter();

  const [tipoServicio, setTipoServicio] = useState<TipoServicio>("trayecto");

  const [origen, setOrigen] = useState("Medellín");
  const [destino, setDestino] = useState("");
  const [direccionOrigen, setDireccionOrigen] = useState("");
  const [direccionDestino, setDireccionDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("08:00");
  const [horaFin, setHoraFin] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [viaticosConductor, setViaticosConductor] = useState(false);
  const [pasajeros, setPasajeros] = useState<number>(0);
  const [tipologia, setTipologia] = useState<TipologiaId | null>(null);

  const [resultado, setResultado] = useState<Cotizacion | null>(null);
  const [rutaNoEncontrada, setRutaNoEncontrada] = useState(false);
  const [kmManual, setKmManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  const esTrayecto = tipoServicio === "trayecto" || tipoServicio === "trayecto_ida_regreso";
  const esPorHoras = tipoServicio === "por_horas" || tipoServicio === "dia_sol";
  const esDisponibilidad = tipoServicio === "disponibilidad_completa";

  const formularioCompleto = useMemo(() => {
    const base = Boolean(origen && fecha && hora && pasajeros > 0 && tipologia);
    if (esTrayecto) return Boolean(base && destino);
    if (esPorHoras) return Boolean(base && horaFin);
    return Boolean(base && fechaFin);
  }, [esTrayecto, esPorHoras, origen, destino, fecha, hora, horaFin, fechaFin, pasajeros, tipologia]);

  const infoFestivo = useMemo(() => consultarFestivo(fecha), [fecha]);
  const esFinDeSemanaFecha = useMemo(() => esFinDeSemana(fecha), [fecha]);
  const eventoAplicable = useMemo(
    () => buscarEventoAplicable(origen, esTrayecto ? destino : "", fecha),
    [origen, destino, esTrayecto, fecha]
  );

  const horasEstimadas = useMemo(() => {
    if (!esPorHoras || !hora || !horaFin) return null;
    return calcularHorasContratadas(hora, horaFin);
  }, [esPorHoras, hora, horaFin]);

  const diasEstimados = useMemo(() => {
    if (!esDisponibilidad || !fecha || !fechaFin) return null;
    return calcularDiasContratados(fecha, fechaFin);
  }, [esDisponibilidad, fecha, fechaFin]);

  const restriccionZona = useMemo(() => {
    if (!tipologia) return null;
    if (esTrayecto) {
      return (
        detectarRestriccion(direccionOrigen, origen, tipologia) ??
        detectarRestriccion(direccionDestino, destino, tipologia)
      );
    }
    return detectarRestriccion(direccionOrigen, origen, tipologia);
  }, [esTrayecto, direccionOrigen, direccionDestino, origen, destino, tipologia]);

  function cambiarTipoServicio(id: TipoServicio) {
    setTipoServicio(id);
    setResultado(null);
    setRutaNoEncontrada(false);
    setError(null);
  }

  function cotizarTrayecto(kmIda: number, peajeIda: number) {
    if (!tipologia || !esTrayecto) return;
    const cotizacion = calcularCotizacion({
      tipoServicio: tipoServicio as "trayecto" | "trayecto_ida_regreso",
      origen,
      destino,
      kmIda,
      peajeIda,
      tipologia,
      horaInicio: hora,
      fecha,
      direccionOrigen: direccionOrigen || undefined,
      direccionDestino: direccionDestino || undefined,
      viaticosConductor,
    });
    setResultado(cotizacion);
    setRutaNoEncontrada(false);
    setError(null);
  }

  function cotizarPorHoras() {
    if (!tipologia || !esPorHoras) return;
    const cotizacion = calcularCotizacion({
      tipoServicio: tipoServicio as "por_horas" | "dia_sol",
      origen,
      tipologia,
      horaInicio: hora,
      horaFin,
      fecha,
      direccion: direccionOrigen || undefined,
      viaticosConductor,
    });
    setResultado(cotizacion);
    setError(null);
  }

  function cotizarDisponibilidad() {
    if (!tipologia || !esDisponibilidad) return;
    const cotizacion = calcularCotizacion({
      tipoServicio: "disponibilidad_completa",
      origen,
      tipologia,
      horaInicio: hora,
      fecha,
      fechaFin,
      direccion: direccionOrigen || undefined,
      viaticosConductor,
    });
    setResultado(cotizacion);
    setError(null);
  }

  function manejarCotizar() {
    setError(null);
    setResultado(null);

    if (!formularioCompleto) {
      setError(
        esTrayecto
          ? "Completa origen, destino, fecha, hora, pasajeros y el tipo de vehículo."
          : esPorHoras
          ? "Completa origen, fecha, hora de inicio, hora final, pasajeros y el tipo de vehículo."
          : "Completa origen, fecha de inicio, fecha final, hora, pasajeros y el tipo de vehículo."
      );
      return;
    }

    if (esTrayecto) {
      const distancia = obtenerDistanciaSync(origen, destino);
      if (!distancia) {
        setRutaNoEncontrada(true);
        return;
      }
      cotizarTrayecto(distancia.km, distancia.peaje);
    } else if (esPorHoras) {
      cotizarPorHoras();
    } else {
      cotizarDisponibilidad();
    }
  }

  function manejarCotizarManual() {
    const km = Number(kmManual);
    if (!km || km <= 0) {
      setError("Ingresa un número de kilómetros válido.");
      return;
    }
    const distancia = estimarDistanciaManual(km);
    cotizarTrayecto(distancia.km, distancia.peaje);
  }

  function compartirPorWhatsApp() {
    if (!resultado) return;
    window.open(linkWhatsApp(mensajeCotizacion(resultado)), "_blank", "noopener,noreferrer");
  }

  function publicarEsteServicio() {
    if (!resultado || !tipologia || !esTrayecto) return;
    const parametros = new URLSearchParams({
      publicar: "1",
      origen,
      destino,
      fecha,
      hora,
      pasajeros: String(pasajeros),
      tipologia,
      valorSugerido: String(resultado.total),
    });
    router.push(`/tablero?${parametros.toString()}`);
  }

  return (
    <main className="px-4 pb-8 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <Logo tamano="lg" />
      </div>

      <p className="mb-5 text-base text-slate-600">
        Cotiza tu viaje de transporte especial en 30 segundos y mira el precio justo del mercado,
        desglosado.
      </p>

      <div className="mb-4">
        <label htmlFor="tipoServicio" className="mb-1 block text-sm font-bold text-slate-600">
          TIPO DE SERVICIO
        </label>
        <select
          id="tipoServicio"
          value={tipoServicio}
          onChange={(e) => cambiarTipoServicio(e.target.value as TipoServicio)}
          className="btn-grande w-full border-2 border-rc-azul bg-white px-4 text-lg font-bold text-rc-azul"
        >
          {TIPOS_SERVICIO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.etiqueta}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-slate-500">
          {TIPOS_SERVICIO.find((t) => t.id === tipoServicio)?.texto}
        </p>
      </div>

      <form
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-tarjeta"
        onSubmit={(e) => {
          e.preventDefault();
          manejarCotizar();
        }}
      >
        <div>
          <label htmlFor="origen" className="mb-1 block text-sm font-bold text-slate-600">
            {esTrayecto ? "ORIGEN" : "CIUDAD / MUNICIPIO"}
          </label>
          <input
            id="origen"
            list="municipios"
            value={origen}
            onChange={(e) => {
              setOrigen(e.target.value);
              setResultado(null);
              setRutaNoEncontrada(false);
            }}
            className="btn-grande w-full border border-slate-300 px-4 text-lg"
            placeholder="Ej: Medellín"
          />
        </div>

        <div>
          <label htmlFor="direccionOrigen" className="mb-1 block text-sm font-bold text-slate-600">
            {esTrayecto
              ? "DIRECCIÓN EXACTA DE ORIGEN (OPCIONAL)"
              : "DIRECCIÓN O ZONA DE SERVICIO (OPCIONAL)"}
          </label>
          <input
            id="direccionOrigen"
            value={direccionOrigen}
            onChange={(e) => setDireccionOrigen(e.target.value)}
            className="btn-grande w-full border border-slate-300 px-4 text-base"
            placeholder="Ej: Cra 43A #1-50, Parque Lleras"
          />
          <p className="mt-1 text-xs text-slate-400">
            Para verificar si tu vehículo puede ingresar a esa dirección. Todavía no está conectado
            a Google Maps — ver nota en el README.
          </p>
        </div>

        {esTrayecto && (
          <>
            <div>
              <label htmlFor="destino" className="mb-1 block text-sm font-bold text-slate-600">
                DESTINO
              </label>
              <input
                id="destino"
                list="municipios"
                value={destino}
                onChange={(e) => {
                  setDestino(e.target.value);
                  setResultado(null);
                  setRutaNoEncontrada(false);
                }}
                className="btn-grande w-full border border-slate-300 px-4 text-lg"
                placeholder="Ej: Guatapé"
              />
            </div>

            <div>
              <label
                htmlFor="direccionDestino"
                className="mb-1 block text-sm font-bold text-slate-600"
              >
                DIRECCIÓN EXACTA DE DESTINO (OPCIONAL)
              </label>
              <input
                id="direccionDestino"
                value={direccionDestino}
                onChange={(e) => setDireccionDestino(e.target.value)}
                className="btn-grande w-full border border-slate-300 px-4 text-base"
                placeholder="Ej: Calle del Recuerdo, Guatapé"
              />
            </div>
          </>
        )}

        <datalist id="municipios">
          {MUNICIPIOS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fecha" className="mb-1 block text-sm font-bold text-slate-600">
              FECHA {esDisponibilidad ? "INICIO" : ""}
            </label>
            <input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="btn-grande w-full border border-slate-300 px-3 text-base"
            />
          </div>
          <div>
            <label htmlFor="hora" className="mb-1 block text-sm font-bold text-slate-600">
              HORA {esPorHoras || esDisponibilidad ? "INICIO" : ""}
            </label>
            <input
              id="hora"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="btn-grande w-full border border-slate-300 px-3 text-base"
            />
          </div>
        </div>

        {esPorHoras && (
          <div>
            <label htmlFor="horaFin" className="mb-1 block text-sm font-bold text-slate-600">
              HORA FINAL
            </label>
            <input
              id="horaFin"
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="btn-grande w-full border border-slate-300 px-3 text-base"
            />
            {horasEstimadas !== null && (
              <p className="mt-1 text-xs text-slate-500">
                Horas solicitadas: {horasEstimadas}
                {horasEstimadas < HORAS_MINIMAS[tipoServicio as "por_horas" | "dia_sol"] &&
                  ` — se cobra el mínimo de ${HORAS_MINIMAS[tipoServicio as "por_horas" | "dia_sol"]} horas.`}
              </p>
            )}
          </div>
        )}

        {esDisponibilidad && (
          <div>
            <label htmlFor="fechaFin" className="mb-1 block text-sm font-bold text-slate-600">
              FECHA FIN
            </label>
            <input
              id="fechaFin"
              type="date"
              min={fecha || undefined}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="btn-grande w-full border border-slate-300 px-3 text-base"
            />
            {diasEstimados !== null && (
              <p className="mt-1 text-xs text-slate-500">
                Días solicitados: {diasEstimados} (de {fecha} a {fechaFin}, ambos incluidos)
              </p>
            )}
          </div>
        )}

        {(infoFestivo.esFestivo || esFinDeSemanaFecha || eventoAplicable || restriccionZona) && (
          <div className="space-y-2">
            {(infoFestivo.esFestivo || esFinDeSemanaFecha) && (
              <p className="rounded-xl bg-rc-naranja-claro px-3 py-2 text-sm font-semibold text-rc-naranja">
                📅{" "}
                {infoFestivo.esFestivo
                  ? `Es festivo (${infoFestivo.nombre})`
                  : "Es fin de semana"}{" "}
                — aplica recargo del {Math.round(RECARGO_FIN_DE_SEMANA_FESTIVO * 100)}% por mayor
                ocupación de vehículos.
              </p>
            )}
            {eventoAplicable && (
              <p className="rounded-xl bg-rc-naranja-claro px-3 py-2 text-sm font-semibold text-rc-naranja">
                🎉 Hay {eventoAplicable.nombre} en {eventoAplicable.ciudad} esos días — aplica
                recargo del {Math.round(eventoAplicable.recargo * 100)}% por alta demanda.
              </p>
            )}
            {restriccionZona && (
              <p className="rounded-xl bg-rc-rojo-claro px-3 py-2 text-sm font-semibold text-rc-rojo">
                🚫 Este vehículo no puede ingresar a {restriccionZona.zona}. {restriccionZona.motivo}
              </p>
            )}
          </div>
        )}

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <input
            type="checkbox"
            checked={viaticosConductor}
            onChange={(e) => setViaticosConductor(e.target.checked)}
            className="h-5 w-5 flex-shrink-0"
          />
          <span className="text-sm font-semibold text-slate-700">
            Incluir alimentación y hospedaje del conductor ("todo costo")
          </span>
        </label>

        <div>
          <label htmlFor="pasajeros" className="mb-1 block text-sm font-bold text-slate-600">
            NÚMERO DE PASAJEROS
          </label>
          <input
            id="pasajeros"
            type="number"
            min={1}
            max={45}
            inputMode="numeric"
            value={pasajeros || ""}
            onChange={(e) => {
              setPasajeros(Number(e.target.value));
              setTipologia(null);
              setResultado(null);
            }}
            className="btn-grande w-full border border-slate-300 px-4 text-lg"
            placeholder="Ej: 14"
          />
        </div>

        <SelectorTipologia
          pasajeros={pasajeros}
          seleccionada={tipologia}
          onSeleccionar={(id) => {
            setTipologia(id);
            setResultado(null);
          }}
        />

        {error && (
          <p className="rounded-xl bg-rc-rojo-claro px-4 py-3 text-sm font-semibold text-rc-rojo">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!formularioCompleto}
          className="btn-grande w-full bg-rc-azul text-xl text-white disabled:opacity-40"
        >
          COTIZAR
        </button>
      </form>

      {esTrayecto && rutaNoEncontrada && (
        <div className="mt-4 space-y-3 rounded-2xl border border-rc-amarillo bg-rc-amarillo-claro p-4">
          <p className="text-base font-semibold text-slate-700">
            Destino en verificación — pronto tendremos la tarifa exacta. Mientras tanto, cotiza
            manualmente con el kilometraje aproximado (ida).
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={kmManual}
              onChange={(e) => setKmManual(e.target.value)}
              placeholder="Km de ida"
              className="btn-grande flex-1 border border-slate-300 px-4 text-lg"
            />
            <button
              type="button"
              onClick={manejarCotizarManual}
              className="btn-grande bg-rc-azul px-5 text-white"
            >
              COTIZAR
            </button>
          </div>
        </div>
      )}

      {resultado && (
        <div className="mt-5 space-y-3">
          <DesgloseCotizacion cotizacion={resultado} />
          <button
            type="button"
            onClick={compartirPorWhatsApp}
            className="btn-grande w-full bg-rc-verde text-lg text-white"
          >
            COMPARTIR POR WHATSAPP
          </button>
          {esTrayecto && (
            <button
              type="button"
              onClick={publicarEsteServicio}
              className="btn-grande w-full border-2 border-rc-azul bg-white text-lg text-rc-azul"
            >
              PUBLICAR ESTE SERVICIO
            </button>
          )}
        </div>
      )}
    </main>
  );
}

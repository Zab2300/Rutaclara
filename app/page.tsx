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
  { id: "trayecto", etiqueta: "TRAYECTO", texto: "Origen y destino, precio por distancia" },
  { id: "por_horas", etiqueta: "POR HORAS", texto: "Vehículo por horas en una zona, mín. 4 horas" },
  { id: "dia_sol", etiqueta: "DÍA DE SOL", texto: "Jornada completa, mínimo 9 horas" },
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
  const [pasajeros, setPasajeros] = useState<number>(0);
  const [tipologia, setTipologia] = useState<TipologiaId | null>(null);

  const [resultado, setResultado] = useState<Cotizacion | null>(null);
  const [rutaNoEncontrada, setRutaNoEncontrada] = useState(false);
  const [kmManual, setKmManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  const esPorTiempo = tipoServicio !== "trayecto";

  const formularioCompleto = useMemo(() => {
    const base = Boolean(origen && fecha && hora && pasajeros > 0 && tipologia);
    if (tipoServicio === "trayecto") return Boolean(base && destino);
    return Boolean(base && horaFin);
  }, [tipoServicio, origen, destino, fecha, hora, horaFin, pasajeros, tipologia]);

  const infoFestivo = useMemo(() => consultarFestivo(fecha), [fecha]);
  const esFinDeSemanaFecha = useMemo(() => esFinDeSemana(fecha), [fecha]);
  const eventoAplicable = useMemo(
    () => buscarEventoAplicable(origen, tipoServicio === "trayecto" ? destino : "", fecha),
    [origen, destino, tipoServicio, fecha]
  );

  const horasEstimadas = useMemo(() => {
    if (!esPorTiempo || !hora || !horaFin) return null;
    return calcularHorasContratadas(hora, horaFin);
  }, [esPorTiempo, hora, horaFin]);

  const restriccionZona = useMemo(() => {
    if (!tipologia) return null;
    if (tipoServicio === "trayecto") {
      return (
        detectarRestriccion(direccionOrigen, origen, tipologia) ??
        detectarRestriccion(direccionDestino, destino, tipologia)
      );
    }
    return detectarRestriccion(direccionOrigen, origen, tipologia);
  }, [tipoServicio, direccionOrigen, direccionDestino, origen, destino, tipologia]);

  function cambiarTipoServicio(id: TipoServicio) {
    setTipoServicio(id);
    setResultado(null);
    setRutaNoEncontrada(false);
    setError(null);
  }

  function cotizarTrayecto(kmIda: number, peajeIda: number) {
    if (!tipologia) return;
    const cotizacion = calcularCotizacion({
      tipoServicio: "trayecto",
      origen,
      destino,
      kmIda,
      peajeIda,
      tipologia,
      horaInicio: hora,
      fecha,
      direccionOrigen: direccionOrigen || undefined,
      direccionDestino: direccionDestino || undefined,
    });
    setResultado(cotizacion);
    setRutaNoEncontrada(false);
    setError(null);
  }

  function cotizarPorHoras() {
    if (!tipologia || tipoServicio === "trayecto") return;
    const cotizacion = calcularCotizacion({
      tipoServicio,
      origen,
      tipologia,
      horaInicio: hora,
      horaFin,
      fecha,
      direccion: direccionOrigen || undefined,
    });
    setResultado(cotizacion);
    setError(null);
  }

  function manejarCotizar() {
    setError(null);
    setResultado(null);

    if (!formularioCompleto) {
      setError(
        tipoServicio === "trayecto"
          ? "Completa origen, destino, fecha, hora, pasajeros y el tipo de vehículo."
          : "Completa origen, fecha, hora de inicio, hora final, pasajeros y el tipo de vehículo."
      );
      return;
    }

    if (tipoServicio === "trayecto") {
      const distancia = obtenerDistanciaSync(origen, destino);
      if (!distancia) {
        setRutaNoEncontrada(true);
        return;
      }
      cotizarTrayecto(distancia.km, distancia.peaje);
    } else {
      cotizarPorHoras();
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
    if (!resultado || !tipologia || tipoServicio !== "trayecto") return;
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

      <div className="mb-4 space-y-2">
        {TIPOS_SERVICIO.map((t) => {
          const activo = tipoServicio === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => cambiarTipoServicio(t.id)}
              className={`btn-grande flex w-full items-center justify-between border-2 px-4 text-left ${
                activo ? "border-rc-azul bg-rc-azul text-white" : "border-slate-200 bg-white"
              }`}
              aria-pressed={activo}
            >
              <span className="font-bold">{t.etiqueta}</span>
              <span className={`text-sm ${activo ? "text-white/90" : "text-slate-500"}`}>
                {t.texto}
              </span>
            </button>
          );
        })}
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
            {esPorTiempo ? "CIUDAD / MUNICIPIO" : "ORIGEN"}
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

        {tipoServicio === "trayecto" && (
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
        )}

        <datalist id="municipios">
          {MUNICIPIOS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <div>
          <label htmlFor="direccionOrigen" className="mb-1 block text-sm font-bold text-slate-600">
            {tipoServicio === "trayecto"
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

        {tipoServicio === "trayecto" && (
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
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fecha" className="mb-1 block text-sm font-bold text-slate-600">
              FECHA
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
              HORA {esPorTiempo ? "INICIO" : ""}
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

        {esPorTiempo && (
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

      {tipoServicio === "trayecto" && rutaNoEncontrada && (
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
          {tipoServicio === "trayecto" && (
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

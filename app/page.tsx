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
import { calcularCotizacion, RECARGO_FIN_DE_SEMANA_FESTIVO } from "@/lib/tarifas";
import { MUNICIPIOS, obtenerDistanciaSync, estimarDistanciaManual } from "@/lib/distancias";
import { mensajeCotizacion, linkWhatsApp } from "@/lib/whatsapp";
import { consultarFestivo, esFinDeSemana } from "@/lib/festivos";
import { buscarEventoAplicable } from "@/lib/eventos";
import type { Cotizacion, TipologiaId } from "@/lib/tipos";

export default function PaginaCotizador() {
  const router = useRouter();

  const [origen, setOrigen] = useState("Medellín");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("08:00");
  const [pasajeros, setPasajeros] = useState<number>(0);
  const [tipologia, setTipologia] = useState<TipologiaId | null>(null);

  const [resultado, setResultado] = useState<Cotizacion | null>(null);
  const [rutaNoEncontrada, setRutaNoEncontrada] = useState(false);
  const [kmManual, setKmManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  const formularioCompleto = useMemo(
    () => Boolean(origen && destino && fecha && hora && pasajeros > 0 && tipologia),
    [origen, destino, fecha, hora, pasajeros, tipologia]
  );

  const infoFestivo = useMemo(() => consultarFestivo(fecha), [fecha]);
  const esFinDeSemanaFecha = useMemo(() => esFinDeSemana(fecha), [fecha]);
  const eventoAplicable = useMemo(
    () => buscarEventoAplicable(origen, destino, fecha),
    [origen, destino, fecha]
  );

  function cotizarConDistancia(kmIda: number, peajeIda: number) {
    if (!tipologia) return;
    const cotizacion = calcularCotizacion({
      origen,
      destino,
      kmIda,
      peajeIda,
      tipologia,
      horaInicio: hora,
      fecha,
    });
    setResultado(cotizacion);
    setRutaNoEncontrada(false);
    setError(null);
  }

  function manejarCotizar() {
    setError(null);
    setResultado(null);

    if (!formularioCompleto) {
      setError("Completa origen, destino, fecha, hora, pasajeros y el tipo de vehículo.");
      return;
    }

    const distancia = obtenerDistanciaSync(origen, destino);
    if (!distancia) {
      setRutaNoEncontrada(true);
      return;
    }
    cotizarConDistancia(distancia.km, distancia.peaje);
  }

  function manejarCotizarManual() {
    const km = Number(kmManual);
    if (!km || km <= 0) {
      setError("Ingresa un número de kilómetros válido.");
      return;
    }
    const distancia = estimarDistanciaManual(km);
    cotizarConDistancia(distancia.km, distancia.peaje);
  }

  function compartirPorWhatsApp() {
    if (!resultado) return;
    window.open(linkWhatsApp(mensajeCotizacion(resultado)), "_blank", "noopener,noreferrer");
  }

  function publicarEsteServicio() {
    if (!resultado || !tipologia) return;
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

      <form
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-tarjeta"
        onSubmit={(e) => {
          e.preventDefault();
          manejarCotizar();
        }}
      >
        <div>
          <label htmlFor="origen" className="mb-1 block text-sm font-bold text-slate-600">
            ORIGEN
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

        <datalist id="municipios">
          {MUNICIPIOS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

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
              HORA
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

        {(infoFestivo.esFestivo || esFinDeSemanaFecha || eventoAplicable) && (
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

      {rutaNoEncontrada && (
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
          <button
            type="button"
            onClick={publicarEsteServicio}
            className="btn-grande w-full border-2 border-rc-azul bg-white text-lg text-rc-azul"
          >
            PUBLICAR ESTE SERVICIO
          </button>
        </div>
      )}
    </main>
  );
}

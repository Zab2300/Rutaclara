/**
 * Helpers para generar mensajes de WhatsApp formateados y su link de envío.
 * No depende de la API de WhatsApp Business — usa el esquema público
 * "wa.me" que abre WhatsApp con el texto precargado, sin credenciales.
 */

import { TARIFAS_KM, formatoMoneda } from "./tarifas";
import type { Cotizacion, Servicio } from "./tipos";

function formatoFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function mensajeCotizacion(cotizacion: Cotizacion): string {
  const tipologia = TARIFAS_KM[cotizacion.tipologia];
  const lineas = [
    `*Cotización RutaClara*`,
    `${cotizacion.origen} → ${cotizacion.destino}`,
    `Vehículo: ${tipologia.nombre}`,
    `Distancia: ${cotizacion.kmIda} km (ida) · ${cotizacion.kmTotales} km totales`,
    cotizacion.aplicaRecargoNocturno ? `Incluye recargo nocturno (30%)` : null,
    `*Valor: ${formatoMoneda(cotizacion.total)}*`,
    ``,
    `Tarifa de referencia del mercado — Antioquia 2026.`,
    `Cotiza el tuyo en RutaClara.`,
  ].filter(Boolean);
  return lineas.join("\n");
}

type DatosServicioParaMensaje = Pick<
  Servicio,
  "origen" | "destino" | "tipologia" | "pasajeros" | "fecha" | "hora" | "valor"
>;

export function mensajeServicio(servicio: DatosServicioParaMensaje): string {
  const tipologia = TARIFAS_KM[servicio.tipologia];
  const lineas = [
    `*Servicio disponible en RutaClara*`,
    `${servicio.origen} → ${servicio.destino}`,
    `Vehículo requerido: ${tipologia.nombre}`,
    `Pasajeros: ${servicio.pasajeros}`,
    `Fecha: ${formatoFecha(servicio.fecha)} · ${servicio.hora}`,
    `*Valor: ${formatoMoneda(servicio.valor)}*`,
    ``,
    `Tómalo desde el tablero de RutaClara.`,
  ];
  return lineas.join("\n");
}

/** Genera el link wa.me con el texto ya codificado para URL. */
export function linkWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

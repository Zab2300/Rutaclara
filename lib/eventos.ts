/**
 * Eventos y temporadas altas por ciudad — cuando hay ferias, fiestas o
 * eventos grandes, la ocupación de los vehículos sube y con ella el precio.
 * Datos demo en data/eventos.json (fechas ilustrativas para 2026).
 *
 * TODO(integración real): reemplazar data/eventos.json por una fuente
 * mantenida (agenda cultural de cada alcaldía, o un calendario propio del
 * gremio), manteniendo la misma forma de EventoCiudad.
 */

import eventosData from "@/data/eventos.json";
import type { EventoCiudad } from "./tipos";

const EVENTOS = eventosData as EventoCiudad[];

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function fechaEnRango(fecha: string, inicio: string, fin: string): boolean {
  // Comparación lexicográfica segura: mismo formato "YYYY-MM-DD" para las tres.
  return fecha >= inicio && fecha <= fin;
}

/** Busca si el origen o el destino tienen un evento activo en la fecha del servicio. */
export function buscarEventoAplicable(
  origen: string,
  destino: string,
  fecha: string
): EventoCiudad | null {
  if (!fecha) return null;
  const o = normalizar(origen);
  const d = normalizar(destino);
  return (
    EVENTOS.find(
      (evento) =>
        fechaEnRango(fecha, evento.fechaInicio, evento.fechaFin) &&
        (normalizar(evento.ciudad) === o || normalizar(evento.ciudad) === d)
    ) ?? null
  );
}

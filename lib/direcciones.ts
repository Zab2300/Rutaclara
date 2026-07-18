/**
 * Verificación de restricciones de acceso por zona — ABSTRAÍDO A PROPÓSITO,
 * igual que lib/distancias.ts.
 *
 * Hoy: coincidencia de palabras clave sobre una lista precargada de zonas
 * conocidas con restricción vehicular (centros históricos, zonas de alta
 * congestión) en `data/zonas-restringidas.json`.
 *
 * TODO(integración real con Google Maps Platform — requiere API key propia
 * con facturación habilitada, no incluida en este prototipo):
 *   1. Places Autocomplete en los campos de dirección, para sugerir y
 *      validar direcciones reales mientras el usuario escribe (en vez de un
 *      input de texto libre).
 *   2. Geocoding API para resolver la dirección escrita a lat/lng exactos.
 *   3. Point-in-polygon contra las zonas de restricción reales (según el
 *      decreto municipal de movilidad vigente) en vez del emparejamiento
 *      por palabra clave que usa esta versión.
 * La forma de `RestriccionZona` (lib/tipos.ts) ya está pensada para no
 * cambiar cuando se haga ese reemplazo.
 */

import zonasData from "@/data/zonas-restringidas.json";
import type { RestriccionZona, TipologiaId } from "./tipos";

interface ZonaRestringidaData {
  municipio: string;
  zona: string;
  claves: string[];
  motivo: string;
  tipologiasRestringidas: TipologiaId[];
}

const ZONAS = zonasData as ZonaRestringidaData[];

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Busca si una dirección de texto libre cae en una zona con restricción de
 * acceso, y si la tipología elegida está afectada allí. Devuelve null si no
 * hay dirección, no hay coincidencia, o la tipología no está restringida.
 */
export function detectarRestriccion(
  direccion: string | undefined,
  municipio: string,
  tipologia: TipologiaId
): RestriccionZona | null {
  if (!direccion || !municipio) return null;
  const direccionNormalizada = normalizar(direccion);
  const municipioNormalizado = normalizar(municipio);

  const zona = ZONAS.find(
    (z) =>
      normalizar(z.municipio) === municipioNormalizado &&
      z.claves.some((clave) => direccionNormalizada.includes(normalizar(clave)))
  );

  if (!zona || !zona.tipologiasRestringidas.includes(tipologia)) return null;

  return {
    zona: zona.zona,
    municipio: zona.municipio,
    motivo: zona.motivo,
    tipologiasRestringidas: zona.tipologiasRestringidas,
  };
}

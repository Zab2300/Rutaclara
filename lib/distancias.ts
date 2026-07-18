/**
 * Servicio de distancias — ABSTRAÍDO A PROPÓSITO.
 *
 * Hoy responde con una tabla de rutas precargadas (solo trayectos desde/hacia
 * Medellín). El día que se conecte Google Routes API (o cualquier otro
 * proveedor), solo hay que reemplazar el cuerpo de `obtenerDistancia` por una
 * llamada real — la firma de la función (entrada/salida) no debería cambiar,
 * así que ningún componente que la use necesita tocarse.
 *
 * TODO(integración real):
 *   1. Crear una API key de Google Routes API.
 *   2. Reemplazar `buscarEnTablaLocal` por un fetch a
 *      https://routes.googleapis.com/directions/v2:computeRoutes
 *   3. Mantener el mismo tipo de retorno `ResultadoDistancia` (o adaptarlo
 *      con un mapper) para no romper el resto de la app.
 *   4. Considerar cachear resultados (las rutas entre los mismos municipios
 *      no cambian de un día para otro) para no gastar cuota de la API.
 */

import type { ResultadoDistancia, Ruta } from "./tipos";

export const MEDELLIN = "Medellín";

/**
 * Rutas reales desde Medellín: km de ida y peaje estimado por sentido para
 * vehículo liviano (el motor de tarifas aplica el multiplicador para
 * vehículos grandes). Ver lib/tarifas.ts → peajeParaTipologia.
 */
export const RUTAS_DESDE_MEDELLIN: Ruta[] = [
  { origen: MEDELLIN, destino: "Aeropuerto JMC (Rionegro)", km: 35, peaje: 18600 },
  { origen: MEDELLIN, destino: "Guatapé", km: 79, peaje: 18600 },
  { origen: MEDELLIN, destino: "El Peñol", km: 69, peaje: 18600 },
  { origen: MEDELLIN, destino: "Rionegro", km: 34, peaje: 18600 },
  { origen: MEDELLIN, destino: "El Retiro", km: 33, peaje: 18600 },
  { origen: MEDELLIN, destino: "La Ceja", km: 43, peaje: 18600 },
  { origen: MEDELLIN, destino: "Santa Fe de Antioquia", km: 57, peaje: 15800 },
  { origen: MEDELLIN, destino: "San Jerónimo", km: 38, peaje: 15800 },
  { origen: MEDELLIN, destino: "Sopetrán", km: 49, peaje: 15800 },
  { origen: MEDELLIN, destino: "Jardín", km: 134, peaje: 12400 },
  { origen: MEDELLIN, destino: "Jericó", km: 113, peaje: 12400 },
  { origen: MEDELLIN, destino: "Guatapé - Represa", km: 81, peaje: 18600 },
  { origen: MEDELLIN, destino: "Doradal", km: 166, peaje: 32000 },
  { origen: MEDELLIN, destino: "Puerto Triunfo", km: 175, peaje: 32000 },
  { origen: MEDELLIN, destino: "La Pintada", km: 79, peaje: 12400 },
  { origen: MEDELLIN, destino: "Bogotá", km: 416, peaje: 96000 },
  { origen: MEDELLIN, destino: "Pereira", km: 212, peaje: 54000 },
  { origen: MEDELLIN, destino: "Manizales", km: 195, peaje: 48000 },
  { origen: MEDELLIN, destino: "Cartagena", km: 643, peaje: 118000 },
  { origen: MEDELLIN, destino: "Coveñas", km: 502, peaje: 92000 },
  { origen: MEDELLIN, destino: "Tolú", km: 512, peaje: 92000 },
  { origen: MEDELLIN, destino: "Santa Marta", km: 716, peaje: 132000 },
  { origen: MEDELLIN, destino: "Barranquilla", km: 690, peaje: 126000 },
  { origen: MEDELLIN, destino: "Cali", km: 414, peaje: 88000 },
  { origen: MEDELLIN, destino: "Bucaramanga", km: 390, peaje: 84000 },
  { origen: MEDELLIN, destino: "Montería", km: 340, peaje: 62000 },
  { origen: MEDELLIN, destino: "Turbo", km: 340, peaje: 46000 },
  { origen: MEDELLIN, destino: "Caucasia", km: 285, peaje: 40000 },
  { origen: MEDELLIN, destino: "Necoclí", km: 385, peaje: 46000 },
  { origen: MEDELLIN, destino: "Urrao", km: 159, peaje: 15800 },
];

/** Lista de municipios para el autocomplete: Medellín + todos los destinos. */
export const MUNICIPIOS: string[] = [
  MEDELLIN,
  ...RUTAS_DESDE_MEDELLIN.map((r) => r.destino),
];

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, ""); // quita tildes tras normalizar (NFD)
}

function buscarEnTablaLocal(origen: string, destino: string): Ruta | null {
  const o = normalizar(origen);
  const d = normalizar(destino);
  return (
    RUTAS_DESDE_MEDELLIN.find(
      (r) =>
        (normalizar(r.origen) === o && normalizar(r.destino) === d) ||
        (normalizar(r.origen) === d && normalizar(r.destino) === o)
    ) ?? null
  );
}

/**
 * Punto único de entrada para obtener km y peaje entre dos municipios.
 * Hoy: busca en la tabla local (solo rutas desde/hacia Medellín).
 * Mañana: llamar a Google Routes API aquí adentro, misma firma de salida.
 */
export async function obtenerDistancia(
  origen: string,
  destino: string
): Promise<ResultadoDistancia | null> {
  const ruta = buscarEnTablaLocal(origen, destino);
  if (!ruta) return null;
  return { km: ruta.km, peaje: ruta.peaje, verificada: true };
}

/** Versión síncrona para UI que no quiere manejar promesas (misma tabla local). */
export function obtenerDistanciaSync(origen: string, destino: string): ResultadoDistancia | null {
  const ruta = buscarEnTablaLocal(origen, destino);
  if (!ruta) return null;
  return { km: ruta.km, peaje: ruta.peaje, verificada: true };
}

/**
 * Estimación manual para cuando el destino no está en la tabla ("Destino en
 * verificación"). El usuario ingresa el km directamente y se asume un peaje
 * proporcional conservador para no dejar el campo en cero.
 */
export function estimarDistanciaManual(kmIda: number): ResultadoDistancia {
  const peajeEstimado = kmIda > 400 ? 90000 : Math.round(kmIda * 250);
  return { km: kmIda, peaje: peajeEstimado, verificada: false };
}

/** Zona geográfica de cada destino, usada para los chips de filtro del tablero. */
const ZONA_POR_DESTINO: Record<string, string> = {
  "aeropuerto jmc (rionegro)": "Oriente",
  guatape: "Oriente",
  "el penol": "Oriente",
  rionegro: "Oriente",
  "el retiro": "Oriente",
  "la ceja": "Oriente",
  "santa fe de antioquia": "Occidente",
  "san jeronimo": "Occidente",
  sopetran: "Occidente",
  jardin: "Suroeste",
  jerico: "Suroeste",
  "guatape - represa": "Oriente",
  doradal: "Magdalena Medio",
  "puerto triunfo": "Magdalena Medio",
  "la pintada": "Suroeste",
  urrao: "Suroeste",
  turbo: "Urabá",
  necocli: "Urabá",
  caucasia: "Norte",
};

/** Devuelve la zona de un destino conocido; si no está mapeado, cae a "Larga distancia". */
export function zonaParaDestino(destino: string): string {
  return ZONA_POR_DESTINO[normalizar(destino)] ?? "Larga distancia";
}

/**
 * Motor de tarifas de RutaClara.
 *
 * Funciones puras (sin efectos secundarios, sin fetch, sin estado) para que
 * sean fáciles de testear. Toda la lógica de negocio del cotizador vive aquí.
 *
 * Lógica del cálculo (ver README.md para el detalle completo):
 *  1. El tramo de tarifa se determina con el km DE IDA (no el total).
 *  2. subtotalKm = km_ida × $/km del tramo — el $/km del listado ya está
 *     pensado sobre el km de ida, así cotiza el mercado hoy.
 *  3. Los peajes se cobran ida y regreso: peaje_ida × 2.
 *  4. El recargo nocturno (30%) aplica sobre el subtotalKm (el valor del
 *     servicio en sí), no sobre los peajes, que son un costo de paso fijo.
 *  5. Se compara contra la tarifa mínima de la tipología; si el cálculo da
 *     menos, se usa la mínima.
 *  6. El total se redondea al múltiplo de $1.000 más cercano.
 */

import type {
  Cotizacion,
  IndiceTramo,
  ParametrosCotizacion,
  Tipologia,
  TipologiaId,
} from "./tipos";

// ---------------------------------------------------------------------------
// Datos de tarifas (Antioquia, 2026) — ver PROMPT original, valores reales
// ---------------------------------------------------------------------------

export const TARIFAS_KM: Record<TipologiaId, Tipologia> = {
  automovil: {
    id: "automovil",
    nombre: "Automóvil (4 pax)",
    capacidad: 4,
    tarifas: [5600, 4000, 3550, 3200],
  },
  campero: {
    id: "campero",
    nombre: "Campero 4x4 (5 pax)",
    capacidad: 5,
    tarifas: [7600, 5450, 4800, 4350],
  },
  camioneta_sw: {
    id: "camioneta_sw",
    nombre: "Camioneta SW 4x2 (5 pax)",
    capacidad: 5,
    tarifas: [7100, 5100, 4500, 4100],
  },
  doble_cabina: {
    id: "doble_cabina",
    nombre: "Camioneta doble cabina 4x4 (5 pax)",
    capacidad: 5,
    tarifas: [8600, 6200, 5450, 4950],
  },
  van8: {
    id: "van8",
    nombre: "Van hasta 8 pax",
    capacidad: 8,
    tarifas: [8100, 5800, 5150, 4650],
  },
  van15: {
    id: "van15",
    nombre: "Van hasta 15 pax",
    capacidad: 15,
    tarifas: [10400, 7800, 7100, 6200],
  },
  van19: {
    id: "van19",
    nombre: "Van techo alto hasta 19 pax",
    capacidad: 19,
    tarifas: [13000, 9650, 8300, 7050],
  },
  buseta: {
    id: "buseta",
    nombre: "Buseta 20-30 pax",
    capacidad: 30,
    tarifas: [14800, 11000, 9400, 8000],
  },
  buseton: {
    id: "buseton",
    nombre: "Busetón 30-40 pax (sin baño)",
    capacidad: 40,
    tarifas: [15500, 11700, 10000, 8300],
  },
  bus: {
    id: "bus",
    nombre: "Bus 40+ pax (con baño)",
    capacidad: 45,
    tarifas: [16100, 12300, 10700, 8600],
  },
};

/** Tarifa mínima por servicio, evita cotizaciones absurdas en trayectos muy cortos. */
export const TARIFA_MINIMA: Record<TipologiaId, number> = {
  automovil: 90000,
  campero: 120000,
  camioneta_sw: 110000,
  doble_cabina: 130000,
  van8: 130000,
  van15: 150000,
  van19: 180000,
  buseta: 200000,
  buseton: 220000,
  bus: 250000,
};

/** Recargo nocturno: 20:00 a 06:00. */
export const RECARGO_NOCTURNO = 0.3;

/** Multiplicador de peaje para vehículos de más de 2 ejes (buseta/busetón/bus). */
const MULTIPLICADOR_PEAJE_VEHICULO_GRANDE = 1.8;
const TIPOLOGIAS_VEHICULO_GRANDE: TipologiaId[] = ["buseta", "buseton", "bus"];

// ---------------------------------------------------------------------------
// Orden de tramos: [0-50km, 50-150km, 150-400km, +400km]
// ---------------------------------------------------------------------------

export function obtenerTramo(kmIda: number): IndiceTramo {
  if (kmIda <= 50) return 0;
  if (kmIda <= 150) return 1;
  if (kmIda <= 400) return 2;
  return 3;
}

/**
 * Devuelve las tipologías cuya capacidad alcanza para el número de pasajeros
 * indicado, ordenadas de menor a mayor capacidad (la más ajustada primero).
 */
export function obtenerTipologiasParaPasajeros(pasajeros: number): Tipologia[] {
  return Object.values(TARIFAS_KM)
    .filter((t) => t.capacidad >= pasajeros)
    .sort((a, b) => a.capacidad - b.capacidad);
}

/** true si la hora (formato "HH:mm") cae en el rango nocturno 20:00-06:00. */
export function esHorarioNocturno(horaInicio: string): boolean {
  const [horas] = horaInicio.split(":").map(Number);
  if (Number.isNaN(horas)) return false;
  return horas >= 20 || horas < 6;
}

/** Ajusta el peaje de ida según el tamaño del vehículo (buses pagan más eje). */
export function peajeParaTipologia(peajeBaseIda: number, tipologia: TipologiaId): number {
  if (TIPOLOGIAS_VEHICULO_GRANDE.includes(tipologia)) {
    return Math.round(peajeBaseIda * MULTIPLICADOR_PEAJE_VEHICULO_GRANDE);
  }
  return peajeBaseIda;
}

/** Redondea al múltiplo de $1.000 más cercano. */
export function redondearMil(valor: number): number {
  return Math.round(valor / 1000) * 1000;
}

/** Formatea un valor en pesos colombianos: "$1.250.000". */
export function formatoMoneda(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-CO")}`;
}

/**
 * Calcula la cotización completa para un servicio.
 * `params.peajeIda` debe ser el peaje base (vehículo liviano); esta función
 * aplica el multiplicador ×1.8 para buseta/busetón/bus automáticamente.
 */
export function calcularCotizacion(params: ParametrosCotizacion): Cotizacion {
  const { origen, destino, kmIda, peajeIda, tipologia, horaInicio } = params;

  const tipologiaData = TARIFAS_KM[tipologia];
  const tramo = obtenerTramo(kmIda);
  const tarifaKmAplicada = tipologiaData.tarifas[tramo];

  const kmTotales = kmIda * 2;
  const subtotalKm = kmIda * tarifaKmAplicada;

  const peajeIdaAjustado = peajeParaTipologia(peajeIda, tipologia);
  const peajes = peajeIdaAjustado * 2;

  const aplicaRecargoNocturno = esHorarioNocturno(horaInicio);
  const recargoNocturnoValor = aplicaRecargoNocturno
    ? Math.round(subtotalKm * RECARGO_NOCTURNO)
    : 0;

  const preTotal = subtotalKm + peajes + recargoNocturnoValor;
  const minima = TARIFA_MINIMA[tipologia];
  const tarifaMinimaAplicada = preTotal < minima;

  const total = redondearMil(tarifaMinimaAplicada ? minima : preTotal);

  return {
    origen,
    destino,
    tipologia,
    kmIda,
    kmTotales,
    tramo,
    tarifaKmAplicada,
    subtotalKm,
    peajes,
    aplicaRecargoNocturno,
    recargoNocturnoValor,
    tarifaMinimaAplicada,
    total,
  };
}

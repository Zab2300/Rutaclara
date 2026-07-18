/**
 * Motor de tarifas de RutaClara.
 *
 * Funciones puras (sin efectos secundarios, sin fetch, sin estado) para que
 * sean fáciles de testear. Toda la lógica de negocio del cotizador vive aquí.
 *
 * Hay dos modelos de precio, ver README.md para el detalle completo:
 *
 * A) TRAYECTO (origen → destino, por distancia)
 *  1. El tramo de tarifa se determina con el km DE IDA (no el total).
 *  2. subtotalKm = km_ida × $/km del tramo — el $/km del listado ya está
 *     pensado sobre el km de ida, así cotiza el mercado hoy.
 *  3. Los peajes se cobran ida y regreso: peaje_ida × 2.
 *
 * B) POR HORAS / DÍA DE SOL (vehículo contratado por tiempo)
 *  1. Por horas: mínimo 4 horas. Día de sol: mínimo 9 horas.
 *  2. paqueteBase = precio fijo del mínimo (TARIFA_POR_HORAS).
 *  3. Las horas que excedan el mínimo se cobran aparte:
 *     horasAdicionales × valorHoraAdicional.
 *  4. No se cobran peajes (no hay una ruta fija definida).
 *
 * En ambos casos, sobre el "subtotal del servicio" (subtotalKm o
 * subtotalHoras) se acumulan los mismos recargos porcentuales:
 *   - Nocturno (30%): hora de inicio entre 8:00 p.m. y 6:00 a.m.
 *   - Fin de semana/festivo (20%): sábado, domingo o festivo colombiano.
 *   - Evento/temporada alta (varía por evento): ferias o fiestas conocidas
 *     en el origen o destino en esas fechas.
 * Luego se compara contra la tarifa/paquete mínimo, y el total se redondea
 * al múltiplo de $1.000 más cercano.
 *
 * Además, si se indica una dirección exacta, se verifica si la tipología
 * elegida tiene restricción de acceso en esa zona (lib/direcciones.ts) —
 * esto es solo informativo, no cambia el precio.
 */

import { detectarRestriccion } from "./direcciones";
import { buscarEventoAplicable } from "./eventos";
import { consultarFestivo, esFinDeSemana } from "./festivos";
import type {
  Cotizacion,
  IndiceTramo,
  ParametrosCotizacion,
  ParametrosCotizacionPorHoras,
  ParametrosCotizacionTrayecto,
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

/** Tarifa mínima por servicio de trayecto, evita cotizaciones absurdas en tramos muy cortos. */
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

/** Horas mínimas por tipo de servicio contratado por tiempo. */
export const HORAS_MINIMAS: Record<"por_horas" | "dia_sol", number> = {
  por_horas: 4,
  dia_sol: 9,
};

interface TarifaPorHoras {
  /** Precio fijo por las horas mínimas del servicio "por horas" (4h). */
  paquete4Horas: number;
  /** Precio fijo por las horas mínimas del servicio "día de sol" (9h). */
  paqueteDiaSol: number;
  /** Valor de cada hora que exceda el mínimo del paquete elegido. */
  valorHoraAdicional: number;
}

/** Tarifas por tiempo (Antioquia, 2026): vehículo contratado por horas, no por ruta. */
export const TARIFA_POR_HORAS: Record<TipologiaId, TarifaPorHoras> = {
  automovil: { paquete4Horas: 140000, paqueteDiaSol: 260000, valorHoraAdicional: 25000 },
  campero: { paquete4Horas: 170000, paqueteDiaSol: 310000, valorHoraAdicional: 30000 },
  camioneta_sw: { paquete4Horas: 160000, paqueteDiaSol: 290000, valorHoraAdicional: 28000 },
  doble_cabina: { paquete4Horas: 180000, paqueteDiaSol: 330000, valorHoraAdicional: 32000 },
  van8: { paquete4Horas: 190000, paqueteDiaSol: 360000, valorHoraAdicional: 35000 },
  van15: { paquete4Horas: 230000, paqueteDiaSol: 450000, valorHoraAdicional: 45000 },
  van19: { paquete4Horas: 280000, paqueteDiaSol: 540000, valorHoraAdicional: 55000 },
  buseta: { paquete4Horas: 340000, paqueteDiaSol: 650000, valorHoraAdicional: 65000 },
  buseton: { paquete4Horas: 380000, paqueteDiaSol: 720000, valorHoraAdicional: 72000 },
  bus: { paquete4Horas: 420000, paqueteDiaSol: 800000, valorHoraAdicional: 80000 },
};

/** Recargo nocturno: 20:00 a 06:00. */
export const RECARGO_NOCTURNO = 0.3;

/** Recargo por fin de semana o festivo: mayor ocupación de vehículos disponibles. */
export const RECARGO_FIN_DE_SEMANA_FESTIVO = 0.2;

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
 * Calcula cuántas horas cubre un servicio "por horas"/"día de sol" a partir
 * de la hora de inicio y fin ("HH:mm"). Si la hora de fin es menor o igual a
 * la de inicio, se asume que cruza la medianoche. Las horas parciales se
 * redondean hacia arriba (una fracción de hora se cobra como hora completa).
 */
export function calcularHorasContratadas(horaInicio: string, horaFin: string): number {
  const [horaIni, minIni] = horaInicio.split(":").map(Number);
  const [horaFinN, minFin] = horaFin.split(":").map(Number);
  const minutosInicio = horaIni * 60 + minIni;
  let minutosFin = horaFinN * 60 + minFin;
  if (minutosFin <= minutosInicio) minutosFin += 24 * 60;
  return Math.ceil((minutosFin - minutosInicio) / 60);
}

// ---------------------------------------------------------------------------
// Recargos comunes (nocturno, fin de semana/festivo, evento) — comparten
// lógica entre los dos modelos de precio.
// ---------------------------------------------------------------------------

function calcularRecargosPorFecha(
  subtotalServicio: number,
  origen: string,
  destino: string,
  fecha: string,
  horaInicio: string
) {
  const aplicaRecargoNocturno = esHorarioNocturno(horaInicio);
  const recargoNocturnoValor = aplicaRecargoNocturno
    ? Math.round(subtotalServicio * RECARGO_NOCTURNO)
    : 0;

  const infoFestivo = consultarFestivo(fecha);
  const esFinDeSemanaFecha = esFinDeSemana(fecha);
  const aplicaRecargoFinDeSemanaFestivo = esFinDeSemanaFecha || infoFestivo.esFestivo;
  const recargoFinDeSemanaFestivoValor = aplicaRecargoFinDeSemanaFestivo
    ? Math.round(subtotalServicio * RECARGO_FIN_DE_SEMANA_FESTIVO)
    : 0;

  const evento = buscarEventoAplicable(origen, destino, fecha);
  const recargoEventoValor = evento ? Math.round(subtotalServicio * evento.recargo) : 0;

  const totalRecargos =
    recargoNocturnoValor + recargoFinDeSemanaFestivoValor + recargoEventoValor;

  return {
    aplicaRecargoNocturno,
    recargoNocturnoValor,
    esFinDeSemana: esFinDeSemanaFecha,
    esFestivo: infoFestivo.esFestivo,
    nombreFestivo: infoFestivo.nombre,
    aplicaRecargoFinDeSemanaFestivo,
    recargoFinDeSemanaFestivoValor,
    evento,
    recargoEventoValor,
    totalRecargos,
  };
}

function calcularCotizacionTrayecto(params: ParametrosCotizacionTrayecto): Cotizacion {
  const { origen, destino, kmIda, peajeIda, tipologia, horaInicio, fecha } = params;

  const tipologiaData = TARIFAS_KM[tipologia];
  const tramo = obtenerTramo(kmIda);
  const tarifaKmAplicada = tipologiaData.tarifas[tramo];

  const kmTotales = kmIda * 2;
  const subtotalKm = kmIda * tarifaKmAplicada;

  const peajeIdaAjustado = peajeParaTipologia(peajeIda, tipologia);
  const peajes = peajeIdaAjustado * 2;

  const recargos = calcularRecargosPorFecha(subtotalKm, origen, destino, fecha, horaInicio);

  const preTotal = subtotalKm + peajes + recargos.totalRecargos;
  const minima = TARIFA_MINIMA[tipologia];
  const tarifaMinimaAplicada = preTotal < minima;
  const total = redondearMil(tarifaMinimaAplicada ? minima : preTotal);

  const restriccionZona =
    detectarRestriccion(params.direccionOrigen, origen, tipologia) ??
    detectarRestriccion(params.direccionDestino, destino, tipologia);

  return {
    tipoServicio: "trayecto",
    origen,
    destino,
    tipologia,
    fecha,
    horaInicio,
    horaFin: null,
    kmIda,
    kmTotales,
    tramo,
    tarifaKmAplicada,
    subtotalKm,
    peajes,
    horasMinimas: 0,
    horasContratadas: 0,
    horasAdicionales: 0,
    valorHoraAdicional: 0,
    paqueteBase: 0,
    subtotalHoras: 0,
    subtotalServicio: subtotalKm,
    ...recargos,
    restriccionZona,
    tarifaMinimaAplicada,
    total,
  };
}

function calcularCotizacionPorHoras(params: ParametrosCotizacionPorHoras): Cotizacion {
  const { tipoServicio, origen, tipologia, horaInicio, horaFin, fecha } = params;

  const tarifaHoras = TARIFA_POR_HORAS[tipologia];
  const horasMinimas = HORAS_MINIMAS[tipoServicio];
  const paqueteBase =
    tipoServicio === "dia_sol" ? tarifaHoras.paqueteDiaSol : tarifaHoras.paquete4Horas;

  const horasSolicitadas = calcularHorasContratadas(horaInicio, horaFin);
  const horasContratadas = Math.max(horasSolicitadas, horasMinimas);
  const horasAdicionales = horasContratadas - horasMinimas;
  const subtotalHoras = paqueteBase + horasAdicionales * tarifaHoras.valorHoraAdicional;

  const recargos = calcularRecargosPorFecha(subtotalHoras, origen, "", fecha, horaInicio);

  const preTotal = subtotalHoras + recargos.totalRecargos;
  // El paquete base ya funciona como piso: no hay una "tarifa mínima" adicional que comparar.
  const total = redondearMil(preTotal);

  const restriccionZona = detectarRestriccion(params.direccion, origen, tipologia);

  return {
    tipoServicio,
    origen,
    destino: "",
    tipologia,
    fecha,
    horaInicio,
    horaFin,
    kmIda: 0,
    kmTotales: 0,
    tramo: null,
    tarifaKmAplicada: 0,
    subtotalKm: 0,
    peajes: 0,
    horasMinimas,
    horasContratadas,
    horasAdicionales,
    valorHoraAdicional: tarifaHoras.valorHoraAdicional,
    paqueteBase,
    subtotalHoras,
    subtotalServicio: subtotalHoras,
    ...recargos,
    restriccionZona,
    tarifaMinimaAplicada: false,
    total,
  };
}

/**
 * Calcula la cotización completa para un servicio, sea por trayecto (km) o
 * por tiempo (horas / día de sol) — ver `params.tipoServicio`.
 * En trayecto, `params.peajeIda` debe ser el peaje base (vehículo liviano);
 * esta función aplica el multiplicador ×1.8 para buseta/busetón/bus.
 */
export function calcularCotizacion(params: ParametrosCotizacion): Cotizacion {
  if (params.tipoServicio === "trayecto") {
    return calcularCotizacionTrayecto(params);
  }
  return calcularCotizacionPorHoras(params);
}

/**
 * Tipos del dominio de RutaClara.
 *
 * Estas interfaces describen la forma de los datos tal como se espera que
 * lleguen desde una API real más adelante (ver README.md, sección "Qué está
 * simulado"). Por ahora los datos viven en archivos JSON dentro de `data/`.
 */

// ---------------------------------------------------------------------------
// Vehículos y tarifas
// ---------------------------------------------------------------------------

/** Llave interna de cada tipología de vehículo (coincide con las llaves de TARIFAS_KM). */
export type TipologiaId =
  | "automovil"
  | "campero"
  | "camioneta_sw"
  | "doble_cabina"
  | "van8"
  | "van15"
  | "van19"
  | "buseta"
  | "buseton"
  | "bus";

/** Índice de tramo de distancia usado por la curva de $/km degresiva. */
export type IndiceTramo = 0 | 1 | 2 | 3;

export interface Tipologia {
  id: TipologiaId;
  nombre: string;
  /** Capacidad máxima de pasajeros de esta tipología. */
  capacidad: number;
  /** $/km por tramo: [0-50km, 50-150km, 150-400km, +400km]. */
  tarifas: [number, number, number, number];
}

// ---------------------------------------------------------------------------
// Rutas y distancias
// ---------------------------------------------------------------------------

export interface Ruta {
  origen: string;
  destino: string;
  /** Kilómetros de ida (sentido único). */
  km: number;
  /** Peaje estimado por sentido, para vehículo liviano. */
  peaje: number;
}

/** Resultado de consultar el servicio de distancias (ver lib/distancias.ts). */
export interface ResultadoDistancia {
  km: number;
  peaje: number;
  /** true si la ruta viene de la tabla precargada; false si fue estimada manualmente. */
  verificada: boolean;
}

// ---------------------------------------------------------------------------
// Cotización
// ---------------------------------------------------------------------------

/**
 * Tipo de servicio, cada uno con un modelo de precio distinto:
 *  - trayecto: origen → destino, un solo sentido (no incluye el regreso del vehículo).
 *  - trayecto_ida_regreso: origen → destino, el vehículo vuelve (peajes de ida y regreso).
 *  - dia_sol: jornada completa en una zona, mínimo 9h.
 *  - por_horas: vehículo contratado por horas en una zona, mínimo 4h.
 *  - disponibilidad_completa: vehículo disponible varios días para distintos recorridos
 *    (ej. un tour de varios días), se cobra por día.
 */
export type TipoServicio =
  | "trayecto"
  | "trayecto_ida_regreso"
  | "dia_sol"
  | "por_horas"
  | "disponibilidad_completa";

interface ParametrosCotizacionBase {
  tipologia: TipologiaId;
  /** Hora de inicio del servicio en formato "HH:mm", 24 horas. */
  horaInicio: string;
  /** Fecha del servicio en formato "YYYY-MM-DD" (define festivo/fin de semana/evento). */
  fecha: string;
  /**
   * "Todo costo": si el operador cubre alimentación y hospedaje del conductor
   * (en vez de que corra por cuenta del cliente), se suma un viático diario.
   */
  viaticosConductor?: boolean;
}

export interface ParametrosCotizacionTrayecto extends ParametrosCotizacionBase {
  tipoServicio: "trayecto" | "trayecto_ida_regreso";
  origen: string;
  destino: string;
  kmIda: number;
  peajeIda: number;
  /** Dirección exacta (opcional) — se usa solo para verificar restricción de acceso por zona. */
  direccionOrigen?: string;
  direccionDestino?: string;
}

export interface ParametrosCotizacionPorHoras extends ParametrosCotizacionBase {
  tipoServicio: "por_horas" | "dia_sol";
  /** Ciudad/municipio donde opera el servicio. */
  origen: string;
  /** Hora en la que termina el servicio, formato "HH:mm". */
  horaFin: string;
  /** Dirección exacta o zona (opcional) — se usa solo para verificar restricción de acceso. */
  direccion?: string;
}

export interface ParametrosCotizacionDisponibilidad extends ParametrosCotizacionBase {
  tipoServicio: "disponibilidad_completa";
  /** Ciudad/municipio base desde donde opera el vehículo. */
  origen: string;
  /** Cantidad de días que el vehículo queda disponible. */
  numeroDias: number;
  /** Dirección exacta o zona (opcional) — se usa solo para verificar restricción de acceso. */
  direccion?: string;
}

export type ParametrosCotizacion =
  | ParametrosCotizacionTrayecto
  | ParametrosCotizacionPorHoras
  | ParametrosCotizacionDisponibilidad;

/** Evento o temporada alta de una ciudad que incrementa la demanda (y el precio). */
export interface EventoCiudad {
  nombre: string;
  ciudad: string;
  fechaInicio: string; // "YYYY-MM-DD"
  fechaFin: string; // "YYYY-MM-DD"
  /** Recargo adicional sobre el subtotal del servicio, ej. 0.25 = 25%. */
  recargo: number;
}

/** Zona con restricción de acceso para ciertos tamaños de vehículo (ver lib/direcciones.ts). */
export interface RestriccionZona {
  zona: string;
  municipio: string;
  motivo: string;
  tipologiasRestringidas: TipologiaId[];
}

export interface Cotizacion {
  tipoServicio: TipoServicio;
  origen: string;
  /** "" cuando el tipo de servicio es por_horas/dia_sol (no aplica destino fijo). */
  destino: string;
  tipologia: TipologiaId;
  fecha: string;
  horaInicio: string;
  /** Solo para por_horas/dia_sol. */
  horaFin: string | null;

  // --- Trayecto (0 cuando tipoServicio no es "trayecto") ---
  kmIda: number;
  kmTotales: number;
  tramo: IndiceTramo | null;
  tarifaKmAplicada: number;
  subtotalKm: number;
  peajes: number;

  // --- Por horas / día de sol (0 cuando no aplica) ---
  horasMinimas: number;
  horasContratadas: number;
  horasAdicionales: number;
  valorHoraAdicional: number;
  paqueteBase: number;
  subtotalHoras: number;

  // --- Disponibilidad completa (0 cuando no aplica) ---
  numeroDias: number;
  valorPorDia: number;
  subtotalDisponibilidad: number;

  /** Base sobre la que se calculan los recargos porcentuales (subtotalKm, subtotalHoras o subtotalDisponibilidad). */
  subtotalServicio: number;

  aplicaRecargoNocturno: boolean;
  recargoNocturnoValor: number;
  esFinDeSemana: boolean;
  esFestivo: boolean;
  nombreFestivo?: string;
  aplicaRecargoFinDeSemanaFestivo: boolean;
  recargoFinDeSemanaFestivoValor: number;
  evento: EventoCiudad | null;
  recargoEventoValor: number;

  /** "Todo costo": alimentación y hospedaje del conductor, cobrados aparte (no llevan recargo %). */
  viaticosIncluidos: boolean;
  valorViaticos: number;

  /** Alerta operativa (no cambia el precio): la tipología elegida no puede entrar a esa zona. */
  restriccionZona: RestriccionZona | null;

  tarifaMinimaAplicada: boolean;
  total: number;
}

// ---------------------------------------------------------------------------
// Publicadores y reputación
// ---------------------------------------------------------------------------

export interface Publicador {
  id: string;
  nombre: string;
  verificado: boolean;
  esNuevo: boolean;
  serviciosPublicados: number;
  porcentajePagados: number;
  /** Si el publicador es nuevo, puede ofrecer garantía de pago asegurado. */
  pagoAsegurado: boolean;
  telefonoSimulado: string;
}

// ---------------------------------------------------------------------------
// Servicios (tablero)
// ---------------------------------------------------------------------------

export type ModoAsignacion = "RAPIDO" | "SELECCION" | "DIRECTO";

export type EstadoServicio =
  | "Publicado"
  | "Tomado"
  | "En curso"
  | "Completado"
  | "Pago confirmado";

export interface Servicio {
  id: string;
  publicadorId: string;
  origen: string;
  destino: string;
  fecha: string; // formato "YYYY-MM-DD"
  hora: string; // formato "HH:mm"
  tipologia: TipologiaId;
  pasajeros: number;
  valor: number;
  modoAsignacion: ModoAsignacion;
  estado: EstadoServicio;
  observaciones?: string;
  /** Zona usada para el filtro por zona del tablero. */
  zona: string;
  tomadoPorTransportadorId?: string;
}

// ---------------------------------------------------------------------------
// Transportador / vehículo / documentos (perfil)
// ---------------------------------------------------------------------------

export type EstadoDocumento = "verde" | "amarillo" | "rojo";

export interface Documento {
  nombre: string;
  estado: EstadoDocumento;
  vigenciaTexto: string;
  diasRestantes: number;
}

export interface Vehiculo {
  placa: string;
  tipologia: TipologiaId;
  empresaVinculacion: string;
  fotoPlaceholder: string;
}

export interface Transportador {
  id: string;
  nombre: string;
  vehiculo: Vehiculo;
  documentos: Documento[];
  serviciosCompletados: number;
  calificacion: number; // 0-5
  porcentajePuntualidad: number;
}

export interface BeneficioAfiliado {
  titulo: string;
  aliado: string;
  etiqueta?: string;
}

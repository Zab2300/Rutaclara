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

export interface ParametrosCotizacion {
  origen: string;
  destino: string;
  kmIda: number;
  peajeIda: number;
  tipologia: TipologiaId;
  /** Hora de inicio del servicio en formato "HH:mm", 24 horas. */
  horaInicio: string;
}

export interface Cotizacion {
  origen: string;
  destino: string;
  tipologia: TipologiaId;
  kmIda: number;
  kmTotales: number;
  tramo: IndiceTramo;
  tarifaKmAplicada: number;
  subtotalKm: number;
  peajes: number;
  aplicaRecargoNocturno: boolean;
  recargoNocturnoValor: number;
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

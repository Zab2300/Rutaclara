/**
 * Festivos de Colombia, calculados algorítmicamente — no es una lista fija
 * por año, así que sirve para cualquier fecha sin mantenimiento.
 *
 * Reglas:
 *  - 6 festivos de fecha fija (Año Nuevo, Trabajo, Independencia, Boyacá,
 *    Inmaculada Concepción, Navidad).
 *  - 10 festivos "Ley Emiliani": si no caen en lunes, se trasladan al lunes
 *    siguiente (incluye los que dependen de la Pascua: Ascensión, Corpus
 *    Christi, Sagrado Corazón).
 *  - Jueves y Viernes Santo: dependen de la Pascua, no se trasladan.
 */

interface Festivo {
  fecha: string; // "YYYY-MM-DD"
  nombre: string;
}

function formatoFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function parsearFechaLocal(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

/** Domingo de Pascua para un año dado (algoritmo de Meeus/Jones/Butcher). */
function calcularDomingoPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

/** Ley Emiliani: si el festivo no cae en lunes, se traslada al lunes siguiente. */
function trasladarALunes(fecha: Date): Date {
  const diaSemana = fecha.getDay(); // 0 = domingo, 1 = lunes, ...
  if (diaSemana === 1) return fecha;
  const diasHastaLunes = diaSemana === 0 ? 1 : 8 - diaSemana;
  return sumarDias(fecha, diasHastaLunes);
}

const cacheFestivosPorAnio = new Map<number, Festivo[]>();

export function obtenerFestivosColombia(anio: number): Festivo[] {
  const enCache = cacheFestivosPorAnio.get(anio);
  if (enCache) return enCache;

  const pascua = calcularDomingoPascua(anio);

  const festivosFijos: Festivo[] = [
    { fecha: formatoFechaISO(new Date(anio, 0, 1)), nombre: "Año Nuevo" },
    { fecha: formatoFechaISO(new Date(anio, 4, 1)), nombre: "Día del Trabajo" },
    { fecha: formatoFechaISO(new Date(anio, 6, 20)), nombre: "Día de la Independencia" },
    { fecha: formatoFechaISO(new Date(anio, 7, 7)), nombre: "Batalla de Boyacá" },
    { fecha: formatoFechaISO(new Date(anio, 11, 8)), nombre: "Inmaculada Concepción" },
    { fecha: formatoFechaISO(new Date(anio, 11, 25)), nombre: "Navidad" },
  ];

  const festivosLeyEmiliani: Festivo[] = [
    { fecha: formatoFechaISO(trasladarALunes(new Date(anio, 0, 6))), nombre: "Reyes Magos" },
    { fecha: formatoFechaISO(trasladarALunes(new Date(anio, 2, 19))), nombre: "San José" },
    { fecha: formatoFechaISO(trasladarALunes(sumarDias(pascua, 39))), nombre: "Ascensión del Señor" },
    { fecha: formatoFechaISO(trasladarALunes(sumarDias(pascua, 60))), nombre: "Corpus Christi" },
    {
      fecha: formatoFechaISO(trasladarALunes(sumarDias(pascua, 68))),
      nombre: "Sagrado Corazón de Jesús",
    },
    { fecha: formatoFechaISO(trasladarALunes(new Date(anio, 5, 29))), nombre: "San Pedro y San Pablo" },
    { fecha: formatoFechaISO(trasladarALunes(new Date(anio, 7, 15))), nombre: "Asunción de la Virgen" },
    { fecha: formatoFechaISO(trasladarALunes(new Date(anio, 9, 12))), nombre: "Día de la Raza" },
    { fecha: formatoFechaISO(trasladarALunes(new Date(anio, 10, 1))), nombre: "Todos los Santos" },
    {
      fecha: formatoFechaISO(trasladarALunes(new Date(anio, 10, 11))),
      nombre: "Independencia de Cartagena",
    },
  ];

  const festivosSemanaSanta: Festivo[] = [
    { fecha: formatoFechaISO(sumarDias(pascua, -3)), nombre: "Jueves Santo" },
    { fecha: formatoFechaISO(sumarDias(pascua, -2)), nombre: "Viernes Santo" },
  ];

  const todos = [...festivosFijos, ...festivosLeyEmiliani, ...festivosSemanaSanta];
  cacheFestivosPorAnio.set(anio, todos);
  return todos;
}

/** Consulta si una fecha ("YYYY-MM-DD") es festivo en Colombia. */
export function consultarFestivo(fechaISO: string): { esFestivo: boolean; nombre?: string } {
  const anio = Number(fechaISO.split("-")[0]);
  if (!anio) return { esFestivo: false };
  const festivos = obtenerFestivosColombia(anio);
  const encontrado = festivos.find((f) => f.fecha === fechaISO);
  return encontrado ? { esFestivo: true, nombre: encontrado.nombre } : { esFestivo: false };
}

/** true si la fecha ("YYYY-MM-DD") cae en sábado o domingo. */
export function esFinDeSemana(fechaISO: string): boolean {
  if (!fechaISO) return false;
  const diaSemana = parsearFechaLocal(fechaISO).getDay();
  return diaSemana === 0 || diaSemana === 6;
}

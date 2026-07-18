import { formatoMoneda, TARIFAS_KM } from "@/lib/tarifas";
import { ICONO_TIPOLOGIA } from "@/lib/iconos";
import type { Publicador, Servicio } from "@/lib/tipos";
import InsigniaPagador from "./InsigniaPagador";

const CHIP_MODO: Record<Servicio["modoAsignacion"], { texto: string; clase: string }> = {
  RAPIDO: { texto: "RÁPIDO", clase: "bg-rc-naranja text-white" },
  SELECCION: { texto: "SELECCIÓN", clase: "bg-rc-azul-claro text-white" },
  DIRECTO: { texto: "DIRECTO", clase: "bg-slate-400 text-white" },
};

function formatoFechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

interface Props {
  servicio: Servicio;
  publicador: Publicador;
  onTomar?: () => void;
  /** true si el transportador demo ya se postuló/tomó este servicio. */
  postulado?: boolean;
}

export default function TarjetaServicio({ servicio, publicador, onTomar, postulado }: Props) {
  const tipologia = TARIFAS_KM[servicio.tipologia];
  const chip = CHIP_MODO[servicio.modoAsignacion];

  const textoBoton =
    servicio.modoAsignacion === "RAPIDO" ? "TOMAR SERVICIO" : "POSTULARME";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-tarjeta">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${chip.clase}`}>
          {chip.texto}
        </span>
        <span className="text-sm font-semibold text-slate-500">
          {formatoFechaCorta(servicio.fecha)} · {servicio.hora}
        </span>
      </div>

      <div className="mb-1 flex items-center gap-2 text-xl font-extrabold text-slate-800">
        <span className="truncate">{servicio.origen}</span>
        <span className="text-rc-naranja" aria-hidden="true">→</span>
        <span className="truncate">{servicio.destino}</span>
      </div>

      <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500">
        <span aria-hidden="true">{ICONO_TIPOLOGIA[servicio.tipologia]}</span>
        {tipologia.nombre} · {servicio.pasajeros} pax
      </div>

      <div className="mb-3">
        <InsigniaPagador publicador={publicador} />
      </div>

      <div className="mb-4 text-2xl font-extrabold text-rc-verde">
        {formatoMoneda(servicio.valor)}
      </div>

      {postulado ? (
        <span className="btn-grande flex w-full items-center justify-center bg-slate-300 text-lg text-white">
          POSTULADO ✓
        </span>
      ) : servicio.modoAsignacion === "DIRECTO" ? (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-500">
          Asignación directa del publicador a uno de sus favoritos
        </p>
      ) : (
        <button
          type="button"
          onClick={onTomar}
          className={`btn-grande w-full text-lg text-white ${
            servicio.modoAsignacion === "RAPIDO" ? "bg-rc-naranja" : "bg-rc-azul"
          }`}
        >
          {textoBoton}
        </button>
      )}
    </article>
  );
}

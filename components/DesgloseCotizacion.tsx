import { formatoMoneda, TARIFAS_KM } from "@/lib/tarifas";
import { ICONO_TIPOLOGIA } from "@/lib/iconos";
import type { Cotizacion } from "@/lib/tipos";

function Fila({ etiqueta, valor, sutil = false }: { etiqueta: string; valor: string; sutil?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className={`text-base ${sutil ? "text-slate-500" : "text-slate-700"}`}>{etiqueta}</span>
      <span className={`text-base font-semibold ${sutil ? "text-slate-500" : "text-slate-800"}`}>
        {valor}
      </span>
    </div>
  );
}

const ETIQUETA_TIPO_SERVICIO: Record<Cotizacion["tipoServicio"], string> = {
  trayecto: "Trayecto",
  por_horas: "Por horas",
  dia_sol: "Día de sol",
};

export default function DesgloseCotizacion({ cotizacion }: { cotizacion: Cotizacion }) {
  const tipologia = TARIFAS_KM[cotizacion.tipologia];
  const esTrayecto = cotizacion.tipoServicio === "trayecto";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-tarjeta">
      <div className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-rc-azul">
        <span aria-hidden="true">{ICONO_TIPOLOGIA[cotizacion.tipologia]}</span>
        {esTrayecto ? (
          <span className="text-xl">
            {cotizacion.origen} <span className="text-rc-naranja">→</span> {cotizacion.destino}
          </span>
        ) : (
          <span className="text-xl">{cotizacion.origen}</span>
        )}
      </div>
      <p className="mb-4 text-sm font-semibold text-slate-500">
        {tipologia.nombre} · {ETIQUETA_TIPO_SERVICIO[cotizacion.tipoServicio]}
      </p>

      {cotizacion.restriccionZona && (
        <p className="mb-4 rounded-xl bg-rc-rojo-claro px-3 py-2 text-sm font-semibold text-rc-rojo">
          🚫 No puede ingresar a {cotizacion.restriccionZona.zona}. {cotizacion.restriccionZona.motivo}
        </p>
      )}

      <div className="divide-y divide-slate-100">
        {esTrayecto ? (
          <>
            <Fila etiqueta="Distancia (ida)" valor={`${cotizacion.kmIda} km`} sutil />
            <Fila
              etiqueta="Distancia total (ida y regreso)"
              valor={`${cotizacion.kmTotales} km`}
              sutil
            />
            <Fila
              etiqueta="Valor por km aplicado"
              valor={`${formatoMoneda(cotizacion.tarifaKmAplicada)}/km`}
            />
            <Fila etiqueta="Subtotal por distancia" valor={formatoMoneda(cotizacion.subtotalKm)} />
            <Fila etiqueta="Peajes (ida y regreso)" valor={formatoMoneda(cotizacion.peajes)} />
          </>
        ) : (
          <>
            <Fila
              etiqueta="Horas contratadas"
              valor={`${cotizacion.horasContratadas} h (mínimo ${cotizacion.horasMinimas} h)`}
              sutil
            />
            <Fila
              etiqueta={`Paquete mínimo (${cotizacion.horasMinimas} h)`}
              valor={formatoMoneda(cotizacion.paqueteBase)}
            />
            {cotizacion.horasAdicionales > 0 && (
              <Fila
                etiqueta={`Horas adicionales (${cotizacion.horasAdicionales} × ${formatoMoneda(
                  cotizacion.valorHoraAdicional
                )})`}
                valor={formatoMoneda(cotizacion.horasAdicionales * cotizacion.valorHoraAdicional)}
              />
            )}
            <Fila etiqueta="Subtotal del servicio" valor={formatoMoneda(cotizacion.subtotalHoras)} />
          </>
        )}
        {cotizacion.aplicaRecargoNocturno && (
          <Fila
            etiqueta="Recargo nocturno (30%)"
            valor={formatoMoneda(cotizacion.recargoNocturnoValor)}
          />
        )}
        {cotizacion.aplicaRecargoFinDeSemanaFestivo && (
          <Fila
            etiqueta={
              cotizacion.esFestivo
                ? `Recargo festivo — ${cotizacion.nombreFestivo} (20%)`
                : "Recargo fin de semana (20%)"
            }
            valor={formatoMoneda(cotizacion.recargoFinDeSemanaFestivoValor)}
          />
        )}
        {cotizacion.evento && (
          <Fila
            etiqueta={`Recargo por evento — ${cotizacion.evento.nombre} (${Math.round(
              cotizacion.evento.recargo * 100
            )}%)`}
            valor={formatoMoneda(cotizacion.recargoEventoValor)}
          />
        )}
        {cotizacion.tarifaMinimaAplicada && (
          <Fila etiqueta="Ajuste a tarifa mínima" valor="aplicado" sutil />
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between rounded-xl bg-rc-verde-claro px-4 py-3">
        <span className="text-lg font-bold text-rc-azul">VALOR TOTAL</span>
        <span className="text-2xl font-extrabold text-rc-verde">
          {formatoMoneda(cotizacion.total)}
        </span>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Tarifa de referencia del mercado — Antioquia 2026.
      </p>
    </div>
  );
}

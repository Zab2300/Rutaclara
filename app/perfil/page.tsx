/**
 * Página 3 — Perfil del transportador (ruta "/perfil").
 * Demostración del semáforo documental y los beneficios de afiliado.
 */

import Logo from "@/components/Logo";
import SemaforoDocumento from "@/components/SemaforoDocumento";
import { TARIFAS_KM } from "@/lib/tarifas";
import { ICONO_TIPOLOGIA } from "@/lib/iconos";
import type { BeneficioAfiliado, Transportador } from "@/lib/tipos";

import transportadorData from "@/data/transportador-demo.json";
import beneficiosData from "@/data/beneficios.json";

export default function PaginaPerfil() {
  const transportador = transportadorData as Transportador;
  const beneficios = beneficiosData as BeneficioAfiliado[];
  const tipologia = TARIFAS_KM[transportador.vehiculo.tipologia];

  const documentoEnAlerta = transportador.documentos.find((d) => d.estado !== "verde");

  return (
    <main className="px-4 pb-8 pt-6">
      <div className="mb-5">
        <Logo />
      </div>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-tarjeta">
        <div className="mb-4 flex items-center gap-4">
          <div
            className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-rc-azul/10 text-4xl"
            aria-hidden="true"
          >
            {ICONO_TIPOLOGIA[transportador.vehiculo.tipologia]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-extrabold text-slate-800">
              {transportador.nombre}
            </p>
            <p className="text-base text-slate-500">{tipologia.nombre}</p>
            <p className="text-sm font-semibold text-slate-400">
              Placa {transportador.vehiculo.placa}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Vinculado a <span className="font-semibold text-slate-700">{transportador.vehiculo.empresaVinculacion}</span>
        </p>
      </section>

      {documentoEnAlerta && (
        <div className="mb-5 rounded-2xl border border-rc-amarillo bg-rc-amarillo-claro px-4 py-3">
          <p className="text-base font-semibold text-slate-700">
            ⚠ Tu {documentoEnAlerta.nombre.toLowerCase()} vence pronto. Renuévala para seguir
            tomando servicios.
          </p>
        </div>
      )}

      <section className="mb-5">
        <h2 className="mb-3 text-lg font-extrabold text-rc-azul">PAPELES AL DÍA</h2>
        <div className="space-y-2">
          {transportador.documentos.map((doc) => (
            <SemaforoDocumento key={doc.nombre} documento={doc} />
          ))}
        </div>
      </section>

      <section className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-tarjeta">
          <p className="text-2xl font-extrabold text-rc-azul">{transportador.serviciosCompletados}</p>
          <p className="text-xs font-semibold text-slate-500">Servicios completados</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-tarjeta">
          <p className="text-2xl font-extrabold text-rc-azul">
            {transportador.calificacion.toFixed(1)} ★
          </p>
          <p className="text-xs font-semibold text-slate-500">Calificación</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-tarjeta">
          <p className="text-2xl font-extrabold text-rc-azul">{transportador.porcentajePuntualidad}%</p>
          <p className="text-xs font-semibold text-slate-500">Puntualidad</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-rc-azul">Beneficios de afiliado</h2>
        <div className="space-y-3">
          {beneficios.map((b) => (
            <div
              key={b.titulo}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-tarjeta"
            >
              <div>
                <p className="text-base font-bold text-slate-800">{b.titulo}</p>
                <p className="text-sm text-slate-500">{b.aliado}</p>
              </div>
              {b.etiqueta && (
                <span className="whitespace-nowrap rounded-full bg-rc-naranja px-2.5 py-1 text-xs font-bold text-white">
                  {b.etiqueta}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

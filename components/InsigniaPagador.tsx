import type { Publicador } from "@/lib/tipos";

export default function InsigniaPagador({ publicador }: { publicador: Publicador }) {
  if (publicador.esNuevo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rc-naranja-claro px-2.5 py-1 text-xs font-bold text-rc-naranja">
        <span aria-hidden="true">⚠</span>
        Publicador nuevo
        {publicador.pagoAsegurado && " · Pago asegurado disponible"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rc-verde-claro px-2.5 py-1 text-xs font-bold text-rc-verde">
      <span aria-hidden="true">✔</span>
      Pagador verificado · {publicador.serviciosPublicados} servicios · {publicador.porcentajePagados}% pagados
    </span>
  );
}

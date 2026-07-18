import type { Documento } from "@/lib/tipos";

const ESTILOS_ESTADO = {
  verde: { punto: "bg-rc-verde", texto: "text-rc-verde", fondo: "bg-rc-verde-claro" },
  amarillo: { punto: "bg-rc-amarillo", texto: "text-yellow-700", fondo: "bg-rc-amarillo-claro" },
  rojo: { punto: "bg-rc-rojo", texto: "text-rc-rojo", fondo: "bg-rc-rojo-claro" },
} as const;

export default function SemaforoDocumento({ documento }: { documento: Documento }) {
  const estilo = ESTILOS_ESTADO[documento.estado];

  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${estilo.fondo}`}>
      <div className="flex items-center gap-3">
        <span
          className={`h-3.5 w-3.5 flex-shrink-0 rounded-full ${estilo.punto}`}
          aria-hidden="true"
        />
        <span className="text-base font-semibold text-slate-800">{documento.nombre}</span>
      </div>
      <span className={`text-sm font-bold ${estilo.texto}`}>{documento.vigenciaTexto}</span>
    </div>
  );
}

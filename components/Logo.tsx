export default function Logo({ tamano = "md" }: { tamano?: "sm" | "md" | "lg" }) {
  const clasesTexto =
    tamano === "lg" ? "text-3xl" : tamano === "sm" ? "text-lg" : "text-xl";

  return (
    <span className={`inline-flex items-center gap-1.5 font-extrabold ${clasesTexto}`}>
      <span aria-hidden="true">🛣️</span>
      <span className="text-rc-azul">Ruta</span>
      <span className="text-rc-verde">Clara</span>
    </span>
  );
}

"use client";

/**
 * Navegación inferior fija con 3 íconos grandes. Nada de menú hamburguesa:
 * las tres acciones principales siempre están a un toque de distancia.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", etiqueta: "Cotizar", icono: "🧮" },
  { href: "/tablero", etiqueta: "Tablero", icono: "📋" },
  { href: "/perfil", etiqueta: "Perfil", icono: "👤" },
] as const;

export default function NavInferior() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map((item) => {
          const activo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition-colors ${
                  activo ? "text-rc-azul" : "text-slate-400"
                }`}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  {item.icono}
                </span>
                <span>{item.etiqueta.toUpperCase()}</span>
                <span
                  className={`mt-0.5 h-1 w-8 rounded-full ${activo ? "bg-rc-azul" : "bg-transparent"}`}
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

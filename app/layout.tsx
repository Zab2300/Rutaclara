import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavInferior from "@/components/NavInferior";
import { ModoDemoProvider } from "@/components/ModoDemoContext";

export const metadata: Metadata = {
  title: "RutaClara — Transporte especial de Antioquia",
  description:
    "Cotiza y publica servicios de transporte especial con la tarifa justa del gremio.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>
        <ModoDemoProvider>
          <div className="contenido-app mx-auto min-h-screen max-w-lg bg-slate-50">
            {children}
          </div>
          <NavInferior />
        </ModoDemoProvider>
      </body>
    </html>
  );
}

"use client";

/**
 * Página 2 — Tablero de servicios (ruta "/tablero").
 * El corazón de la app: dos vistas según el rol del modo demo.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import SelectorModoDemo from "@/components/SelectorModoDemo";
import VistaTransportador from "@/components/VistaTransportador";
import VistaPublicador from "@/components/VistaPublicador";
import { useModoDemo, PUBLICADOR_DEMO_ID, TRANSPORTADOR_DEMO_ID } from "@/components/ModoDemoContext";
import { zonaParaDestino } from "@/lib/distancias";
import type { DatosNuevoServicio } from "@/components/FormularioPublicarServicio";
import type { Publicador, Servicio, TipologiaId } from "@/lib/tipos";

import serviciosIniciales from "@/data/servicios.json";
import publicadoresData from "@/data/publicadores.json";

export default function PaginaTablero() {
  return (
    <Suspense fallback={null}>
      <TableroContenido />
    </Suspense>
  );
}

function TableroContenido() {
  const { rol, setRol } = useModoDemo();
  const searchParams = useSearchParams();

  const [servicios, setServicios] = useState<Servicio[]>(serviciosIniciales as Servicio[]);
  const [yaPostulado, setYaPostulado] = useState<Set<string>>(new Set());

  const publicadoresPorId = useMemo(() => {
    const mapa: Record<string, Publicador> = {};
    (publicadoresData as Publicador[]).forEach((p) => {
      mapa[p.id] = p;
    });
    return mapa;
  }, []);

  const publicadorDemo = publicadoresPorId[PUBLICADOR_DEMO_ID];

  // Si se llega desde "PUBLICAR ESTE SERVICIO" del cotizador, forzar rol
  // publicador y precargar el formulario una sola vez.
  const yaAplicoPrellenado = useRef(false);
  const publicarPrellenado = searchParams.get("publicar") === "1";

  useEffect(() => {
    if (publicarPrellenado && !yaAplicoPrellenado.current) {
      yaAplicoPrellenado.current = true;
      setRol("publicador");
    }
  }, [publicarPrellenado, setRol]);

  function manejarConfirmarToma(servicioId: string) {
    setServicios((actual) =>
      actual.map((s) => {
        if (s.id !== servicioId) return s;
        if (s.modoAsignacion === "RAPIDO") {
          return { ...s, estado: "Tomado", tomadoPorTransportadorId: TRANSPORTADOR_DEMO_ID };
        }
        return s;
      })
    );
    setYaPostulado((actual) => new Set(actual).add(servicioId));
  }

  function manejarPublicar(datos: DatosNuevoServicio) {
    const nuevoServicio: Servicio = {
      id: `svc-${Date.now()}`,
      publicadorId: PUBLICADOR_DEMO_ID,
      origen: datos.origen,
      destino: datos.destino,
      fecha: datos.fecha,
      hora: datos.hora,
      tipologia: datos.tipologia,
      pasajeros: datos.pasajeros,
      valor: datos.valor,
      modoAsignacion: datos.modoAsignacion,
      estado: "Publicado",
      observaciones: datos.observaciones,
      zona: zonaParaDestino(datos.destino),
    };
    setServicios((actual) => [nuevoServicio, ...actual]);
  }

  const valoresIniciales = publicarPrellenado
    ? {
        origen: searchParams.get("origen") ?? undefined,
        destino: searchParams.get("destino") ?? undefined,
        fecha: searchParams.get("fecha") ?? undefined,
        hora: searchParams.get("hora") ?? undefined,
        pasajeros: searchParams.get("pasajeros")
          ? Number(searchParams.get("pasajeros"))
          : undefined,
        tipologia: (searchParams.get("tipologia") as TipologiaId) ?? undefined,
        valorSugerido: searchParams.get("valorSugerido")
          ? Number(searchParams.get("valorSugerido"))
          : undefined,
      }
    : undefined;

  return (
    <main className="px-4 pb-8 pt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Logo />
      </div>
      <div className="mb-5">
        <SelectorModoDemo />
      </div>

      {rol === "transportador" ? (
        <VistaTransportador
          servicios={servicios}
          publicadoresPorId={publicadoresPorId}
          yaPostulado={yaPostulado}
          onConfirmarToma={manejarConfirmarToma}
        />
      ) : (
        <VistaPublicador
          servicios={servicios}
          publicador={publicadorDemo}
          mostrarFormularioInicial={publicarPrellenado}
          valoresIniciales={valoresIniciales}
          onPublicar={manejarPublicar}
        />
      )}
    </main>
  );
}

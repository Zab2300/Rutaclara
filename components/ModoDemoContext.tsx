"use client";

/**
 * Contexto de "modo demo": reemplaza la autenticación real (no hay login).
 * Guarda en localStorage si el visitante está viendo la app como Publicador
 * o como Transportador, para que el tablero muestre la vista correcta.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type RolDemo = "publicador" | "transportador";

const LLAVE_STORAGE = "rutaclara_rol_demo";
/** Publicador "yo" en modo demo — ver data/publicadores.json (pub-1). */
export const PUBLICADOR_DEMO_ID = "pub-1";
/** Transportador "yo" en modo demo — ver data/transportador-demo.json. */
export const TRANSPORTADOR_DEMO_ID = "trans-demo";

interface ModoDemoContextValue {
  rol: RolDemo;
  setRol: (rol: RolDemo) => void;
}

const ModoDemoContext = createContext<ModoDemoContextValue | null>(null);

export function ModoDemoProvider({ children }: { children: ReactNode }) {
  const [rol, setRolState] = useState<RolDemo>("transportador");

  useEffect(() => {
    const guardado = window.localStorage.getItem(LLAVE_STORAGE);
    if (guardado === "publicador" || guardado === "transportador") {
      setRolState(guardado);
    }
  }, []);

  function setRol(nuevoRol: RolDemo) {
    setRolState(nuevoRol);
    window.localStorage.setItem(LLAVE_STORAGE, nuevoRol);
  }

  return (
    <ModoDemoContext.Provider value={{ rol, setRol }}>{children}</ModoDemoContext.Provider>
  );
}

export function useModoDemo(): ModoDemoContextValue {
  const ctx = useContext(ModoDemoContext);
  if (!ctx) {
    throw new Error("useModoDemo debe usarse dentro de <ModoDemoProvider>");
  }
  return ctx;
}

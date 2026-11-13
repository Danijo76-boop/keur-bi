"use client";
import { DependencyList, useEffect, useState } from "react";

const EVENEMENT = "keurbi:maj";

export function lire<T>(cle: string, defaut: T): T {
  if (typeof window === "undefined") return defaut;
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}

export function ecrire<T>(cle: string, valeur: T) {
  localStorage.setItem(cle, JSON.stringify(valeur));
  window.dispatchEvent(new CustomEvent(EVENEMENT));
}

export function nouvelId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

// Relit la valeur au montage, puis à chaque écriture (même onglet ou autre onglet).
export function useStocke<T>(lecture: () => T, defaut: T, deps: DependencyList = []): T {
  const [valeur, setValeur] = useState<T>(defaut);

  useEffect(() => {
    const maj = () => setValeur(lecture());
    maj();
    window.addEventListener(EVENEMENT, maj);
    window.addEventListener("storage", maj);
    return () => {
      window.removeEventListener(EVENEMENT, maj);
      window.removeEventListener("storage", maj);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return valeur;
}

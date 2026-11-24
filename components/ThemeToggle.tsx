"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/icones";

import { CLE_THEME } from "@/lib/theme";

export default function ThemeToggle({ className = "", avecLibelle = false }: { className?: string; avecLibelle?: boolean }) {
  const [sombre, setSombre] = useState(false);

  useEffect(() => {
    const lire = () => setSombre(document.documentElement.classList.contains("dark"));
    lire();
    // Plusieurs boutons (barre du haut, menu mobile) et plusieurs onglets restent synchronisés.
    window.addEventListener("keurbi:theme", lire);
    const autreOnglet = (e: StorageEvent) => {
      if (e.key !== CLE_THEME) return;
      document.documentElement.classList.toggle("dark", e.newValue === "dark");
      lire();
    };
    window.addEventListener("storage", autreOnglet);
    return () => {
      window.removeEventListener("keurbi:theme", lire);
      window.removeEventListener("storage", autreOnglet);
    };
  }, []);

  function basculer() {
    const suivant = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", suivant);
    try {
      localStorage.setItem(CLE_THEME, suivant ? "dark" : "light");
    } catch {
      /* stockage indisponible : le choix vaut pour cette page seulement */
    }
    window.dispatchEvent(new Event("keurbi:theme"));
  }

  const libelle = sombre ? "Mode jour" : "Mode nuit";
  return (
    <button type="button" onClick={basculer} aria-label={`Passer en ${libelle.toLowerCase()}`} aria-pressed={sombre} title={libelle} className={className}>
      {sombre ? <Sun size={20} /> : <Moon size={20} />}
      {avecLibelle && <span>{libelle}</span>}
    </button>
  );
}

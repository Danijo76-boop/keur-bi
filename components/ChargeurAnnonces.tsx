"use client";
import { useEffect } from "react";
import { chargerBiensBase } from "@/lib/annonces";

// Récupère les annonces de la base au démarrage, puis à chaque retour sur l'onglet,
// pour que toutes les pages affichent les données du serveur.
export default function ChargeurAnnonces() {
  useEffect(() => {
    chargerBiensBase();
    const rafraichir = () => document.visibilityState === "visible" && chargerBiensBase(true);
    document.addEventListener("visibilitychange", rafraichir);
    return () => document.removeEventListener("visibilitychange", rafraichir);
  }, []);
  return null;
}

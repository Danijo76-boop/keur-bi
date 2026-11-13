"use client";
import { lire, ecrire, nouvelId } from "./stockage";
import { popup } from "./popup";

export type StatutVisite = "demandee" | "confirmee" | "refusee" | "annulee";

export const LABELS_VISITE: Record<StatutVisite, string> = {
  demandee: "⏳ À confirmer",
  confirmee: "✓ Confirmée",
  refusee: "✗ Refusée",
  annulee: "Annulée",
};

export type Visite = {
  id: string;
  bienId: string;
  bienTitre: string;
  acheteurEmail: string;
  acheteurNom: string;
  telephone?: string;
  date: string;
  message?: string;
  statut: StatutVisite;
  creeLe: string;
};

const CLE = "keurbi_visites";

export function lireVisites(): Visite[] {
  return lire<Visite[]>(CLE, []);
}

export function demanderVisite(v: Omit<Visite, "id" | "statut" | "creeLe">) {
  popup.succes("Demande de visite envoyée", "Le vendeur doit confirmer le créneau.");
  ecrire(CLE, [{ ...v, id: nouvelId(), statut: "demandee", creeLe: new Date().toISOString() }, ...lireVisites()]);
}

export function changerStatutVisite(id: string, statut: StatutVisite) {
  popup.succes({ demandee: "Visite demandée", confirmee: "Visite confirmée", refusee: "Visite refusée", annulee: "Visite annulée" }[statut]);
  ecrire(CLE, lireVisites().map((v) => (v.id === id ? { ...v, statut } : v)));
}

export function visiteActive(bienId: string, email: string, visites: Visite[]): Visite | undefined {
  return visites.find(
    (v) => v.bienId === bienId && v.acheteurEmail === email && (v.statut === "demandee" || v.statut === "confirmee") && new Date(v.date).getTime() > Date.now(),
  );
}

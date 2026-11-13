"use client";
import { lire, ecrire, nouvelId } from "./stockage";
import { popup } from "./popup";

/* ── Signalements d'annonces ── */
export const MOTIFS_SIGNALEMENT = [
  "Arnaque suspectée",
  "Titre Foncier douteux",
  "Prix trompeur",
  "Bien déjà vendu",
  "Photos non conformes",
  "Autre",
];

export type Signalement = {
  id: string;
  bienId: string;
  motif: string;
  detail?: string;
  auteurEmail: string;
  date: string;
  statut: "ouvert" | "classe" | "retire";
};

const CLE_SIGNALEMENTS = "keurbi_signalements";

export function lireSignalements(): Signalement[] {
  return lire<Signalement[]>(CLE_SIGNALEMENTS, []);
}

export function signaler(s: Omit<Signalement, "id" | "date" | "statut">) {
  popup.succes("Signalement envoyé", "Merci. Notre équipe de modération va examiner cette annonce.");
  ecrire(CLE_SIGNALEMENTS, [{ ...s, id: nouvelId(), date: new Date().toISOString(), statut: "ouvert" }, ...lireSignalements()]);
}

// Une décision sur une annonce vaut pour tous ses signalements encore ouverts.
export function traiterSignalements(bienId: string, statut: "classe" | "retire") {
  popup.succes(statut === "retire" ? "Annonce retirée" : "Signalement classé sans suite");
  ecrire(CLE_SIGNALEMENTS, lireSignalements().map((s) => (s.bienId === bienId && s.statut === "ouvert" ? { ...s, statut } : s)));
}

/* ── Avis après transaction ── */
export type Avis = {
  id: string;
  cible: "notaire" | "agence";
  slug: string;
  dossierId: string;
  auteurEmail: string;
  auteurNom: string;
  note: number;
  texte: string;
  date: string;
};

const CLE_AVIS = "keurbi_avis";

export function lireAvis(cible: Avis["cible"], slug: string): Avis[] {
  return lire<Avis[]>(CLE_AVIS, []).filter((a) => a.cible === cible && a.slug === slug);
}

export function avisDuDossier(dossierId: string, cible: Avis["cible"]): Avis | undefined {
  return lire<Avis[]>(CLE_AVIS, []).find((a) => a.dossierId === dossierId && a.cible === cible);
}

// Prénom et initiale seulement : un avis public n'a pas à exposer le nom complet.
function nomPublic(nom: string): string {
  const [prenom, ...reste] = nom.trim().split(/\s+/);
  return reste.length ? `${prenom} ${reste[reste.length - 1][0].toUpperCase()}.` : prenom;
}

export function publierAvis(a: Omit<Avis, "id" | "date" | "auteurNom"> & { nomComplet: string }) {
  popup.succes("Avis publié", "Merci pour votre retour.");
  const { nomComplet, ...reste } = a;
  ecrire(CLE_AVIS, [{ ...reste, auteurNom: nomPublic(nomComplet), id: nouvelId(), date: new Date().toISOString() }, ...lire<Avis[]>(CLE_AVIS, [])]);
}

export function noteAgregee(note: number, nbAvis: number, locaux: Avis[]) {
  const nb = nbAvis + locaux.length;
  const somme = note * nbAvis + locaux.reduce((s, a) => s + a.note, 0);
  return { note: nb ? Math.round((somme / nb) * 10) / 10 : note, nbAvis: nb };
}

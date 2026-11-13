"use client";
import { lire, ecrire, nouvelId } from "./stockage";
import { popup } from "./popup";
import { Bien } from "./mock-data";

/* ── Favoris ── */
const CLE_FAVORIS = "keurbi_favoris";

export function lireFavoris(): string[] {
  return lire<string[]>(CLE_FAVORIS, []);
}

export function basculerFavori(id: string): string[] {
  const favoris = lireFavoris();
  const next = favoris.includes(id) ? favoris.filter((f) => f !== id) : [...favoris, id];
  ecrire(CLE_FAVORIS, next);
  return next;
}

/* ── Notes personnelles sur un bien ── */
const CLE_NOTES = "keurbi_notes_biens";

export function lireNotes(): Record<string, string> {
  return lire<Record<string, string>>(CLE_NOTES, {});
}

export function enregistrerNote(id: string, texte: string) {
  popup.succes(texte.trim() ? "Note enregistrée" : "Note supprimée");
  const notes = { ...lireNotes() };
  if (texte.trim()) notes[id] = texte.trim();
  else delete notes[id];
  ecrire(CLE_NOTES, notes);
}

/* ── Biens consultés ── */
const CLE_VUS = "keurbi_vus";

export function lireVus(): string[] {
  return lire<string[]>(CLE_VUS, []);
}

export function enregistrerVue(id: string) {
  const vus = lireVus();
  if (vus[0] !== id) ecrire(CLE_VUS, [id, ...vus.filter((x) => x !== id)].slice(0, 12));
}

/* ── Comparateur ── */
const CLE_COMPARATEUR = "keurbi_comparateur";
export const MAX_COMPARAISON = 3;

export function lireComparaison(): string[] {
  return lire<string[]>(CLE_COMPARATEUR, []);
}

export function basculerComparaison(id: string): boolean {
  const actuels = lireComparaison();
  if (actuels.includes(id)) {
    ecrire(CLE_COMPARATEUR, actuels.filter((x) => x !== id));
    return true;
  }
  if (actuels.length >= MAX_COMPARAISON) return false;
  ecrire(CLE_COMPARATEUR, [...actuels, id]);
  return true;
}

export function definirComparaison(ids: string[]) {
  ecrire(CLE_COMPARATEUR, ids.slice(0, MAX_COMPARAISON));
}

/* ── Alertes de recherche ── */
const CLE_ALERTES = "keurbi_alertes";

export type CriteresAlerte = {
  q?: string;
  type?: string;
  region?: string;
  prixMax?: number;
  superficieMin?: number;
  superficieMax?: number;
  tfVerifie?: boolean;
};

export type Alerte = {
  id: string;
  email: string;
  nom: string;
  criteres: CriteresAlerte;
  frequence: "Quotidien" | "Hebdomadaire";
  creeLe: string;
};

export function lireAlertes(email: string): Alerte[] {
  return lire<Alerte[]>(CLE_ALERTES, []).filter((a) => a.email === email);
}

export function creerAlerte(email: string, nom: string, criteres: CriteresAlerte, frequence: Alerte["frequence"] = "Quotidien") {
  popup.succes("Alerte créée", nom);
  ecrire(CLE_ALERTES, [
    { id: nouvelId(), email, nom, criteres, frequence, creeLe: new Date().toISOString() },
    ...lire<Alerte[]>(CLE_ALERTES, []),
  ]);
}

export function supprimerAlerte(id: string) {
  popup.succes("Alerte supprimée");
  ecrire(CLE_ALERTES, lire<Alerte[]>(CLE_ALERTES, []).filter((a) => a.id !== id));
}

export function correspond(b: Bien, c: CriteresAlerte, tfVerifie: boolean): boolean {
  if (c.type && b.type !== c.type) return false;
  if (c.region && b.region !== c.region) return false;
  if (c.prixMax && b.prix > c.prixMax) return false;
  if (c.superficieMin && b.superficie < c.superficieMin) return false;
  if (c.superficieMax && b.superficie > c.superficieMax) return false;
  if (c.tfVerifie && !tfVerifie) return false;
  if (c.q && !`${b.titre} ${b.ville} ${b.quartier} ${b.region}`.toLowerCase().includes(c.q.toLowerCase())) return false;
  return true;
}

// Lien vers la recherche pré-filtrée (mêmes paramètres que ceux lus par la page Annonces).
export function urlRecherche(c: CriteresAlerte): string {
  const p = new URLSearchParams();
  if (c.q) p.set("q", c.q);
  if (c.type) p.set("type", c.type);
  if (c.region) p.set("region", c.region);
  if (c.prixMax) p.set("prixMax", String(c.prixMax));
  if (c.superficieMin) p.set("supMin", String(c.superficieMin));
  if (c.superficieMax) p.set("supMax", String(c.superficieMax));
  if (c.tfVerifie) p.set("tf", "verifie");
  const qs = p.toString();
  return qs ? `/annonces?${qs}` : "/annonces";
}

export function resumeCriteres(c: CriteresAlerte): string {
  const parts = [
    c.q,
    c.type,
    c.region,
    c.tfVerifie ? "TF vérifié" : undefined,
    c.prixMax ? `< ${Math.round(c.prixMax / 1_000_000)} M FCFA` : undefined,
    c.superficieMin || c.superficieMax ? `${c.superficieMin ?? 0}–${c.superficieMax ?? "∞"} m²` : undefined,
  ].filter(Boolean);
  return parts.join(" · ") || "Tous les biens";
}

/* ── Rendez-vous ── */
const CLE_RDV = "keurbi_rendezvous";

export type RendezVous = {
  id: string;
  email: string;
  notaireSlug: string;
  notaireNom: string;
  date: string;
  motif: string;
  clientNom?: string;
  dossierId?: string;
};

export function lireRendezVous(): RendezVous[] {
  return lire<RendezVous[]>(CLE_RDV, []);
}

export function ajouterRendezVous(r: Omit<RendezVous, "id">) {
  popup.succes("Rendez-vous enregistré", `${r.notaireNom}, le ${new Date(r.date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}.`);
  ecrire(CLE_RDV, [{ ...r, id: nouvelId() }, ...lireRendezVous()]);
}

export function annulerRendezVous(id: string) {
  popup.succes("Rendez-vous annulé");
  ecrire(CLE_RDV, lireRendezVous().filter((r) => r.id !== id));
}

/* ── Notifications : état lu / préférences de canaux ── */
const CLE_LUES = "keurbi_notifs_lues";
const CLE_CANAUX = "keurbi_notifs_canaux";

export type Canaux = { email: boolean; sms: boolean; whatsapp: boolean };

export function lireLues(): string[] {
  return lire<string[]>(CLE_LUES, []);
}

export function marquerLues(ids: string[]) {
  ecrire(CLE_LUES, Array.from(new Set([...lireLues(), ...ids])));
}

export function lireCanaux(): Canaux {
  return lire<Canaux>(CLE_CANAUX, { email: true, sms: false, whatsapp: false });
}

export function ecrireCanaux(c: Canaux) {
  ecrire(CLE_CANAUX, c);
}

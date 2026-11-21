// Programmes neufs : forme partagée entre le serveur et les pages.
import type { Bien } from "./mock-data";

export type LotProgramme = {
  id: string;
  type: Bien["type"];
  libelle: string;
  superficie: number;
  nbPieces?: number;
  prix: number;
  disponible: boolean;
};

export type Programme = {
  id: string;
  slug: string;
  nom: string;
  promoteur: string;
  agenceSlug?: string;
  auteurEmail?: string;
  region: string;
  ville: string;
  quartier: string;
  description: string;
  photo: string;
  photos: string[];
  livraison: string;
  avancement: string;
  lat?: number;
  lng?: number;
  publie: boolean;
  lots: LotProgramme[];
};

export const AVANCEMENTS = ["Sur plan", "Fondations en cours", "Gros œuvre en cours", "Gros œuvre terminé", "Second œuvre", "Livré"];

// Prix d'appel affiché sur la vignette : le lot disponible le moins cher.
export function aPartirDe(p: Programme): number | undefined {
  const dispo = p.lots.filter((l) => l.disponible);
  return dispo.length ? Math.min(...dispo.map((l) => l.prix)) : undefined;
}

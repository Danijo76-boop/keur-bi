"use client";
import { lire, ecrire } from "./stockage";

/* ── Publicité partenaires ──
   Des entreprises paient pour apparaître auprès de personnes qui cherchent à acheter :
   banques, assureurs, artisans, déménageurs. La facturation se fait au clic (CPC).
   Les annonceurs et les tarifs ci-dessous sont des exemples fictifs pour la démonstration. */

export type Emplacement = "recherche" | "fiche";

export type Campagne = {
  id: string;
  annonceur: string;
  titre: string;
  texte: string;
  cta: string;
  lien: string;
  emplacements: Emplacement[];
  // Coût par clic facturé à l'annonceur, en FCFA.
  cpc: number;
};

export const CAMPAGNES: Campagne[] = [
  {
    id: "credit",
    annonceur: "Banque partenaire A",
    titre: "Votre crédit immobilier dès 7,5 %",
    texte: "Réponse de principe sous 72 h, y compris pour la diaspora.",
    cta: "Comparer les crédits",
    lien: "/financement",
    emplacements: ["recherche", "fiche"],
    cpc: 250,
  },
  {
    id: "assurance",
    annonceur: "Assureur partenaire",
    titre: "Assurez votre futur logement",
    texte: "Multirisque habitation et assurance emprunteur, devis en ligne.",
    cta: "Demander un devis",
    lien: "/contact?sujet=Assurance%20habitation",
    emplacements: ["fiche"],
    cpc: 200,
  },
  {
    id: "construction",
    annonceur: "Constructeur partenaire",
    titre: "Faites construire sur votre terrain",
    texte: "Plans, devis et suivi de chantier par un constructeur agréé.",
    cta: "Être rappelé(e)",
    lien: "/contact?sujet=Construction",
    emplacements: ["recherche", "fiche"],
    cpc: 300,
  },
  {
    id: "demenagement",
    annonceur: "Déménageur partenaire",
    titre: "Un déménagement sans stress",
    texte: "Devis gratuit, partout au Sénégal.",
    cta: "Obtenir un devis",
    lien: "/contact?sujet=D%C3%A9m%C3%A9nagement",
    emplacements: ["recherche"],
    cpc: 150,
  },
];

export type StatsCampagne = { vues: number; clics: number };

const CLE = "keurbi_publicite";

export function lireStatsPublicite(): Record<string, StatsCampagne> {
  return lire<Record<string, StatsCampagne>>(CLE, {});
}

function incrementer(id: string, champ: keyof StatsCampagne) {
  const stats = lireStatsPublicite();
  const actuel = stats[id] ?? { vues: 0, clics: 0 };
  ecrire(CLE, { ...stats, [id]: { ...actuel, [champ]: actuel[champ] + 1 } });
}

export const enregistrerVuePublicite = (id: string) => incrementer(id, "vues");
export const enregistrerClicPublicite = (id: string) => incrementer(id, "clics");

// Rotation simple : chaque emplacement fait tourner ses campagnes d'un affichage à l'autre.
export function choisirCampagne(emplacement: Emplacement, rang: number): Campagne | undefined {
  const eligibles = CAMPAGNES.filter((c) => c.emplacements.includes(emplacement));
  return eligibles.length ? eligibles[rang % eligibles.length] : undefined;
}

export function revenusPublicite(stats: Record<string, StatsCampagne>): number {
  return CAMPAGNES.reduce((s, c) => s + (stats[c.id]?.clics ?? 0) * c.cpc, 0);
}

// Formats vendus aux annonceurs (page « Annoncer sur KEUR GUI »). Prix indicatifs.
export const FORMATS_PUBLICITE = [
  {
    id: "encart_recherche",
    nom: "Encart dans les résultats",
    desc: "Votre offre au milieu des annonces, là où les acheteurs comparent.",
    prix: "250 FCFA par clic",
  },
  { id: "encart_fiche", nom: "Encart sur les fiches", desc: "Affiché à côté du bien que l'acheteur étudie en détail.", prix: "200 à 300 FCFA par clic" },
  { id: "newsletter", nom: "Lettre d'information sponsorisée", desc: "Un encadré dans l'email envoyé aux inscrits.", prix: "75 000 FCFA par envoi" },
  { id: "quartier", nom: "Parrainage d'un quartier", desc: "Votre marque sur la fiche d'un quartier pendant un mois.", prix: "50 000 FCFA par mois" },
];

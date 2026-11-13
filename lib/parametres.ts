"use client";
import { lire, ecrire, nouvelId, useStocke } from "./stockage";
import { popup } from "./popup";

export type Flags = {
  comparateur: boolean;
  carte: boolean;
  boost: boolean;
  tfPrioritaire: boolean;
  signature: boolean;
  maintenance: boolean;
  // Vérification des Titres Fonciers auprès du cadastre et de la DGID.
  cadastre: boolean;
  // Encarts sponsorisés de partenaires sur les pages publiques.
  publicite: boolean;
};

export type Parametres = {
  tauxCommission: number;
  prixBoost: number;
  prixTFPrioritaire: number;
  tvaHonoraires: number;
  droitsEnregistrement: number;
  publiciteFonciere: number;
  fraisMutationTF: number;
  moisEnregistrement: number;
  penaliteRetard: number;
  alerteDGID1: number;
  alerteDGID2: number;
  delaiDGID: number;
  delaiKYC: number;
  scoreMin: number;
  docsAcheteur: string;
  docsVendeur: string;
  validiteOffre: number;
  acompteMin: number;
  maxContreOffres: number;
  decoteMax: number;
  flags: Flags;
};

export const PARAMETRES_DEFAUT: Parametres = {
  tauxCommission: 2,
  prixBoost: 15000,
  prixTFPrioritaire: 25000,
  tvaHonoraires: 18,
  droitsEnregistrement: 7,
  publiciteFonciere: 1,
  fraisMutationTF: 120000,
  moisEnregistrement: 3,
  penaliteRetard: 25,
  alerteDGID1: 30,
  alerteDGID2: 7,
  delaiDGID: 7,
  delaiKYC: 48,
  scoreMin: 40,
  docsAcheteur: "CNI, Justificatif domicile",
  docsVendeur: "CNI, TF original",
  validiteOffre: 7,
  acompteMin: 10,
  maxContreOffres: 3,
  decoteMax: 20,
  flags: { comparateur: true, carte: true, boost: true, tfPrioritaire: false, signature: true, maintenance: false, cadastre: false, publicite: true },
};

const CLE = "keurbi_parametres";
const CLE_AUDIT = "keurbi_parametres_audit";

export type EntreeAudit = { id: string; date: string; auteur: string; detail: string };

export function lireParametres(): Parametres {
  const p = lire<Partial<Parametres>>(CLE, {});
  return { ...PARAMETRES_DEFAUT, ...p, flags: { ...PARAMETRES_DEFAUT.flags, ...p.flags } };
}

export function sauvegarderParametres(p: Parametres, auteur: string, champs: string[]) {
  popup.succes("Paramètres enregistrés", champs.join(", "));
  ecrire(CLE, p);
  ecrire(CLE_AUDIT, [
    { id: nouvelId(), date: new Date().toISOString(), auteur, detail: champs.join(", ") },
    ...lireAudit(),
  ]);
}

export function lireAudit(): EntreeAudit[] {
  return lire<EntreeAudit[]>(CLE_AUDIT, []);
}

export function useParametres(): Parametres {
  return useStocke(lireParametres, PARAMETRES_DEFAUT);
}

// Barème cumulatif des honoraires (écran « Frais & Tarifs »).
export const BAREME_HONORAIRES = [
  { jusqua: 10_000_000, taux: 4 },
  { jusqua: 50_000_000, taux: 2.5 },
  { jusqua: 100_000_000, taux: 2 },
  { jusqua: 200_000_000, taux: 1.5 },
  { jusqua: Infinity, taux: 1 },
];

export function honorairesHT(prix: number): number {
  let total = 0;
  let plancher = 0;
  for (const t of BAREME_HONORAIRES) {
    if (prix <= plancher) break;
    total += ((Math.min(prix, t.jusqua) - plancher) * t.taux) / 100;
    plancher = t.jusqua;
  }
  return Math.round(total);
}

export type DetailFrais = {
  droits: number;
  publicite: number;
  honoraires: number;
  tva: number;
  mutation: number;
  totalFrais: number;
  totalAcquisition: number;
  penaliteRetard: number;
};

export function calculerFrais(prix: number, p: Parametres): DetailFrais {
  const droits = Math.round((prix * p.droitsEnregistrement) / 100);
  const publicite = Math.round((prix * p.publiciteFonciere) / 100);
  const honoraires = honorairesHT(prix);
  const tva = Math.round((honoraires * p.tvaHonoraires) / 100);
  const mutation = prix > 0 ? p.fraisMutationTF : 0;
  const totalFrais = droits + publicite + honoraires + tva + mutation;
  return {
    droits,
    publicite,
    honoraires,
    tva,
    mutation,
    totalFrais,
    totalAcquisition: prix + totalFrais,
    penaliteRetard: Math.round((droits * p.penaliteRetard) / 100),
  };
}

// Commission à la charge du vendeur, par tranche autour du taux de référence.
export function tauxCommissionPour(prix: number, p: Parametres): number {
  if (prix < 50_000_000) return p.tauxCommission + 0.5;
  if (prix > 200_000_000) return p.tauxCommission - 0.5;
  return p.tauxCommission;
}

export function commissionVente(prix: number, p: Parametres): number {
  return Math.round((prix * tauxCommissionPour(prix, p)) / 100);
}

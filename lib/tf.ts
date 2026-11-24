"use client";
import { useEffect, useState } from "react";
import { Bien } from "./mock-data";
import { lire, ecrire, nouvelId, useStocke } from "./stockage";
import { popup } from "./popup";

const STORAGE_KEY = "keurbi_tf_overrides";
const CLE_DEMANDES = "keurbi_tf_demandes";

export type StatutTF = "verifie" | "en_verification" | "non_verifie" | "invalide";

export const LABELS_TF: Record<StatutTF, string> = {
  verifie: "TF Vérifié",
  en_verification: "En vérification",
  non_verifie: "Non vérifié",
  invalide: "TF Invalide",
};

export type DemandeTF = {
  id: string;
  bienId?: string;
  dossierId?: string;
  numero: string;
  region: string;
  proprietaire: string;
  fichier?: string;
  prioritaire: boolean;
  statut: "en_verification" | "verifie" | "invalide";
  motif?: string;
  demandeur: string;
  soumisLe: string;
  traiteLe?: string;
  relances: number;
};

export function lireOverridesTF(): string[] {
  return lire<string[]>(STORAGE_KEY, []);
}

export function lireDemandesTF(): DemandeTF[] {
  return lire<DemandeTF[]>(CLE_DEMANDES, []);
}

function demandesSansBien(bienId: string): DemandeTF[] {
  return lireDemandesTF().filter((d) => d.bienId !== bienId);
}

// La dernière décision humaine l'emporte sur l'état d'origine de l'annonce.
export function basculerVerificationTF(id: string): string[] {
  popup.succes("Statut du Titre Foncier mis à jour");
  const actuels = lireOverridesTF();
  const next = actuels.includes(id) ? actuels.filter((x) => x !== id) : [...actuels, id];
  ecrire(STORAGE_KEY, next);
  ecrire(CLE_DEMANDES, demandesSansBien(id));
  return next;
}

export function estVerifie(bien: Bien, overrides: string[]): boolean {
  return bien.is_verified_tf !== overrides.includes(bien.id);
}

export function statutTF(bien: Bien, overrides: string[], demandes: DemandeTF[]): StatutTF {
  const demande = demandes.find((d) => d.bienId === bien.id);
  if (demande) return demande.statut;
  return estVerifie(bien, overrides) ? "verifie" : "non_verifie";
}

export function useVerificationTF(bien: Bien) {
  const [overrides, setOverrides] = useState<string[]>([]);
  const demandes = useStocke(lireDemandesTF, []);

  useEffect(() => {
    setOverrides(lireOverridesTF());
  }, [demandes]);

  function basculer() {
    setOverrides(basculerVerificationTF(bien.id));
  }

  const statut = statutTF(bien, overrides, demandes);
  return { verifie: statut === "verifie", statut, basculer };
}

export function soumettreDemandeTF(d: Omit<DemandeTF, "id" | "soumisLe" | "statut" | "relances">): DemandeTF {
  popup.succes("Demande de vérification envoyée", `TF ${d.numero}`);
  const nouvelle: DemandeTF = {
    ...d,
    id: nouvelId(),
    soumisLe: new Date().toISOString(),
    statut: "en_verification",
    relances: 0,
  };
  ecrire(CLE_DEMANDES, [nouvelle, ...(d.bienId ? demandesSansBien(d.bienId) : lireDemandesTF())]);
  return nouvelle;
}

export function deciderDemandeTF(id: string, statut: "verifie" | "invalide", motif?: string) {
  popup.succes(statut === "verifie" ? "Titre Foncier validé" : "Titre Foncier déclaré invalide");
  ecrire(
    CLE_DEMANDES,
    lireDemandesTF().map((d) => (d.id === id ? { ...d, statut, motif, traiteLe: new Date().toISOString() } : d)),
  );
}

export function relancerDemandeTF(id: string) {
  popup.succes("Relance envoyée");
  ecrire(
    CLE_DEMANDES,
    lireDemandesTF().map((d) => (d.id === id ? { ...d, relances: d.relances + 1 } : d)),
  );
}

"use client";
import { lire, ecrire, nouvelId } from "./stockage";
import { lireDossiers, referenceDossier } from "./dossiers";
import { lireAudit, lireParametres } from "./parametres";
import { lireDemandesTF } from "./tf";

export type CategorieJournal = "compte" | "kyc" | "moderation" | "habilitations" | "parametres" | "dossier" | "tf";

export const LABELS_JOURNAL: Record<CategorieJournal, string> = {
  compte: "Comptes",
  kyc: "KYC",
  moderation: "Modération",
  habilitations: "Habilitations",
  parametres: "Paramètres",
  dossier: "Dossiers",
  tf: "Titres Fonciers",
};

export type EntreeJournal = {
  id: string;
  date: string;
  auteur: string;
  categorie: CategorieJournal;
  detail: string;
  lien?: string;
};

const CLE = "keurbi_journal";
const MAX = 500;

// L'auteur est la session en cours : les appelants n'ont pas à le transmettre.
function auteurCourant(): string {
  return lire<{ nom?: string } | null>("keurbi_user", null)?.nom ?? "Système";
}

export function journaliser(categorie: CategorieJournal, detail: string, lien?: string) {
  const entree: EntreeJournal = { id: nouvelId(), date: new Date().toISOString(), auteur: auteurCourant(), categorie, detail, lien };
  ecrire(CLE, [entree, ...lire<EntreeJournal[]>(CLE, [])].slice(0, MAX));
}

// Les actions déjà tracées ailleurs (dossiers, paramètres, TF) sont relues à la source plutôt que dupliquées.
export function journalComplet(): EntreeJournal[] {
  const dossiers = lireDossiers().flatMap((d) =>
    d.evenements.map((e): EntreeJournal => ({
      id: `dossier-${e.id}`,
      date: e.date,
      auteur: "—",
      categorie: "dossier",
      detail: `${referenceDossier(d)} · ${e.libelle}`,
      lien: `/dossiers/${d.id}`,
    })),
  );
  const parametres = lireAudit().map((a): EntreeJournal => ({
    id: `param-${a.id}`,
    date: a.date,
    auteur: a.auteur,
    categorie: "parametres",
    detail: `Paramètres modifiés : ${a.detail}`,
    lien: "/admin/parametres",
  }));
  const tf = lireDemandesTF().flatMap((d) => {
    const lignes: EntreeJournal[] = [
      {
        id: `tf-${d.id}`,
        date: d.soumisLe,
        auteur: d.demandeur,
        categorie: "tf",
        detail: `Vérification demandée : TF ${d.numero}${d.prioritaire ? " (prioritaire)" : ""}`,
        lien: "/verification-tf",
      },
    ];
    if (d.traiteLe) {
      lignes.push({
        id: `tf-${d.id}-decision`,
        date: d.traiteLe,
        auteur: "—",
        categorie: "tf",
        detail: `TF ${d.numero} ${d.statut === "verifie" ? "validé" : "déclaré invalide"}${d.motif ? ` : ${d.motif}` : ""}`,
        lien: lireParametres().flags.cadastre ? "/verification-tf" : undefined,
      });
    }
    return lignes;
  });
  return [...lire<EntreeJournal[]>(CLE, []), ...dossiers, ...parametres, ...tf].sort((a, b) => b.date.localeCompare(a.date));
}

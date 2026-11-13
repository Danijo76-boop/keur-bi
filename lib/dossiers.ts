import { popup } from "./popup";
import { Bien } from "./mock-data";
import { lire, ecrire, nouvelId } from "./stockage";
import { lireParametres } from "./parametres";

export type StatutDossier =
  | "brouillon"
  | "due_diligence"
  | "tf_verifie"
  | "compromis_signe"
  | "en_signature"
  | "actif"
  | "enregistrement_dgid"
  | "enregistre"
  | "mute";

export const ETAPES_DOSSIER: StatutDossier[] = [
  "brouillon",
  "due_diligence",
  "tf_verifie",
  "compromis_signe",
  "en_signature",
  "actif",
  "enregistrement_dgid",
  "enregistre",
  "mute",
];

export const LABELS_ETAPE: Record<StatutDossier, string> = {
  brouillon: "Brouillon",
  due_diligence: "En due diligence",
  tf_verifie: "TF vérifié",
  compromis_signe: "Compromis signé",
  en_signature: "En signature",
  actif: "Acte signé",
  enregistrement_dgid: "Enregistrement DGID",
  enregistre: "Enregistré",
  mute: "TF muté",
};

export type OffreStatut = "en_attente" | "acceptee" | "refusee" | "retiree";

export type Offre = {
  id: string;
  auteur: "acheteur" | "agence";
  montant: number;
  acompte?: string;
  delai?: string;
  conditions?: string;
  message?: string;
  financement?: string;
  validiteJours?: number;
  date: string;
  statut: OffreStatut;
};

export type Evenement = {
  id: string;
  date: string;
  libelle: string;
};

export type Signataire = "notaire" | "acheteur" | "vendeur";
export const SIGNATAIRES: Signataire[] = ["notaire", "acheteur", "vendeur"];

export type Signature = { nom: string; date: string; image: string };

export type MoyenPaiement = "virement" | "mobile_money" | "cheque";
export const LABELS_MOYEN: Record<MoyenPaiement, string> = {
  virement: "Virement bancaire",
  mobile_money: "Wave / Orange Money",
  cheque: "Chèque certifié",
};

export type Paiement = {
  id: string;
  type: "acompte" | "solde";
  montant: number;
  moyen: MoyenPaiement;
  reference: string;
  statut: "declare" | "confirme";
  date: string;
};

export type PieceJointe = { id: string; nom: string; date: string; auteur: string };

export type Dossier = {
  id: string;
  reference?: string;
  bienId: string;
  acheteurEmail: string;
  acheteurNom: string;
  statut: StatutDossier;
  dateOuverture: string;
  dateCompromis?: string;
  dateActe?: string;
  dateLimiteDGID?: string;
  notaireSlug?: string;
  offres: Offre[];
  evenements: Evenement[];
  signatures?: Partial<Record<Signataire, Signature>>;
  paiements?: Paiement[];
  pieces?: PieceJointe[];
  notes?: string;
  incident?: "litigieux" | "resilie";
};

const STORAGE_KEY = "keurbi_dossiers";

export function lireDossiers(): Dossier[] {
  return lire<Dossier[]>(STORAGE_KEY, []);
}

function sauvegarder(dossiers: Dossier[]) {
  ecrire(STORAGE_KEY, dossiers);
}

function evenement(libelle: string): Evenement {
  return { id: nouvelId(), date: new Date().toISOString(), libelle };
}

function majDossier(id: string, maj: (d: Dossier) => Dossier): Dossier[] {
  const dossiers = lireDossiers().map((d) => (d.id === id ? maj(d) : d));
  sauvegarder(dossiers);
  return dossiers;
}

export function referenceDossier(d: Dossier): string {
  return d.reference ?? `KB-2026-${d.id.slice(0, 4).toUpperCase()}`;
}

export function obtenirOuCreerDossier(bien: Bien, acheteurEmail: string, acheteurNom: string, notaireSlug?: string): Dossier {
  const dossiers = lireDossiers();
  const existant = dossiers.find((d) => d.bienId === bien.id && d.acheteurEmail === acheteurEmail);
  if (existant) return existant;

  const nouveau: Dossier = {
    id: nouvelId(),
    reference: `KB-2026-${String(dossiers.length + 1).padStart(4, "0")}`,
    bienId: bien.id,
    acheteurEmail,
    acheteurNom,
    statut: "brouillon",
    dateOuverture: new Date().toISOString(),
    notaireSlug,
    offres: [],
    evenements: [evenement("Dossier ouvert")],
  };
  sauvegarder([nouveau, ...dossiers]);
  return nouveau;
}

export function choisirNotaire(dossierId: string, slug: string, nom: string): Dossier[] {
  popup.succes("Notaire mandaté", nom);
  return majDossier(dossierId, (d) => ({
    ...d,
    notaireSlug: slug,
    evenements: [...d.evenements, evenement(`Notaire mandaté : ${nom}`)],
  }));
}

export function ajouterOffre(dossierId: string, offre: Omit<Offre, "id" | "date">): Dossier[] {
  popup.succes(offre.auteur === "acheteur" ? "Offre envoyée" : "Contre-offre envoyée", `${offre.montant.toLocaleString("fr-FR")} FCFA proposés. L'autre partie est prévenue.`);
  return majDossier(dossierId, (d) => ({
    ...d,
    statut: d.statut === "brouillon" ? "due_diligence" : d.statut,
    offres: [...d.offres, { ...offre, id: nouvelId(), date: new Date().toISOString() }],
    evenements: [
      ...d.evenements,
      evenement(`${offre.auteur === "acheteur" ? "Offre" : "Contre-offre"} de ${offre.montant.toLocaleString()} FCFA`),
    ],
  }));
}

export function repondreOffre(dossierId: string, offreId: string, statut: "acceptee" | "refusee"): Dossier[] {
  popup.succes(statut === "acceptee" ? "Offre acceptée" : "Offre refusée", statut === "acceptee" ? "L'accord est enregistré dans le dossier." : undefined);
  return majDossier(dossierId, (d) => ({
    ...d,
    // Un accord clôt la négociation : les autres offres encore ouvertes tombent.
    offres: d.offres.map((o): Offre =>
      o.id === offreId ? { ...o, statut } : statut === "acceptee" && o.statut === "en_attente" ? { ...o, statut: "refusee" } : o,
    ),
    evenements: [...d.evenements, evenement(`Offre ${statut === "acceptee" ? "acceptée" : "refusée"}`)],
  }));
}

export function retirerOffre(dossierId: string, offreId: string): Dossier[] {
  popup.succes("Offre retirée");
  return majDossier(dossierId, (d) => ({
    ...d,
    offres: d.offres.map((o): Offre => (o.id === offreId && o.statut === "en_attente" ? { ...o, statut: "retiree" } : o)),
    evenements: [...d.evenements, evenement("Offre retirée par son auteur")],
  }));
}

export function offreAcceptee(d: Dossier): Offre | undefined {
  return d.offres.find((o) => o.statut === "acceptee");
}

export function prixRetenu(d: Dossier, bien: Bien): number {
  return offreAcceptee(d)?.montant ?? bien.prix;
}

export function joursAvantExpiration(o: Offre, validiteDefaut: number): number {
  const fin = new Date(o.date).getTime() + (o.validiteJours ?? validiteDefaut) * 86_400_000;
  return Math.ceil((fin - Date.now()) / 86_400_000);
}

export function pourcentageAcompte(d: Dossier, acompteMin: number): number {
  const o = offreAcceptee(d);
  const valeur = o?.acompte ? parseFloat(o.acompte) : NaN;
  return Number.isFinite(valeur) && valeur > 0 ? Math.max(valeur, acompteMin) : acompteMin;
}

export function montantAcompte(d: Dossier, bien: Bien, acompteMin: number): number {
  return Math.round((prixRetenu(d, bien) * pourcentageAcompte(d, acompteMin)) / 100);
}

export function totalConfirme(d: Dossier): number {
  return (d.paiements ?? []).filter((p) => p.statut === "confirme").reduce((s, p) => s + p.montant, 0);
}

export function declarerPaiement(dossierId: string, p: Omit<Paiement, "id" | "date" | "statut">): Dossier[] {
  popup.succes("Versement déclaré", "Le notaire doit maintenant confirmer la réception des fonds.");
  return majDossier(dossierId, (d) => ({
    ...d,
    paiements: [...(d.paiements ?? []), { ...p, id: nouvelId(), date: new Date().toISOString(), statut: "declare" }],
    evenements: [...d.evenements, evenement(`Versement déclaré : ${p.montant.toLocaleString()} FCFA (${LABELS_MOYEN[p.moyen]})`)],
  }));
}

export function confirmerPaiement(dossierId: string, paiementId: string): Dossier[] {
  popup.succes("Versement confirmé", "Les fonds sont enregistrés en séquestre.");
  return majDossier(dossierId, (d) => ({
    ...d,
    paiements: (d.paiements ?? []).map((p) => (p.id === paiementId ? { ...p, statut: "confirme" } : p)),
    evenements: [...d.evenements, evenement("Versement confirmé par le notaire")],
  }));
}

export function signer(dossierId: string, qui: Signataire, signature: Signature): Dossier[] {
  popup.succes("Signature enregistrée", `Acte signé par ${signature.nom}.`);
  return majDossier(dossierId, (d) => ({
    ...d,
    signatures: { ...d.signatures, [qui]: signature },
    evenements: [...d.evenements, evenement(`Acte signé par ${signature.nom}`)],
  }));
}

export function toutesSignatures(d: Dossier): boolean {
  return SIGNATAIRES.every((s) => d.signatures?.[s]);
}

export function ajouterPiece(dossierId: string, nom: string, auteur: string): Dossier[] {
  popup.succes("Document ajouté", nom);
  return majDossier(dossierId, (d) => ({
    ...d,
    pieces: [...(d.pieces ?? []), { id: nouvelId(), nom, auteur, date: new Date().toISOString() }],
    evenements: [...d.evenements, evenement(`Document ajouté : ${nom}`)],
  }));
}

export function enregistrerNotes(dossierId: string, notes: string): Dossier[] {
  popup.succes("Notes enregistrées");
  return majDossier(dossierId, (d) => ({ ...d, notes }));
}

export function signalerIncident(dossierId: string, incident: "litigieux" | "resilie" | undefined): Dossier[] {
  popup.succes(incident === "litigieux" ? "Litige signalé" : incident === "resilie" ? "Dossier résilié" : "Incident levé");
  const libelles = { litigieux: "Dossier signalé en litige", resilie: "Dossier résilié" };
  return majDossier(dossierId, (d) => ({
    ...d,
    incident,
    evenements: [...d.evenements, evenement(incident ? libelles[incident] : "Incident levé")],
  }));
}

// Ce qui bloque l'accord sur le prix, en nommant la partie qui doit agir.
function attenteOffre(d: Dossier, vendeurNom: string): string {
  const validite = lireParametres().validiteOffre;
  const enAttente = [...d.offres].reverse().find((o) => o.statut === "en_attente" && joursAvantExpiration(o, validite) >= 0);
  const montant = (o: Offre) => `${o.montant.toLocaleString("fr-FR")} FCFA`;
  if (enAttente) {
    return enAttente.auteur === "acheteur"
      ? `Réponse du vendeur (${vendeurNom}) à l'offre de ${montant(enAttente)}`
      : `Réponse de l'acheteur (${d.acheteurNom}) à la contre-offre de ${montant(enAttente)}`;
  }
  const derniere = d.offres[d.offres.length - 1];
  if (!derniere) return `Offre de l'acheteur (${d.acheteurNom}) : aucune offre déposée`;
  const motif = derniere.statut === "refusee" ? "refusée" : derniere.statut === "retiree" ? "retirée" : "expirée";
  return `Nouvelle offre de l'acheteur (${d.acheteurNom}) : la dernière a été ${motif}`;
}

// Ce qui manque pour passer à l'étape suivante (machine à états du contrat).
// Chaque condition dit qui doit agir, pour que personne n'attende l'autre sans le savoir.
export function conditionsTransition(d: Dossier, tfVerifie: boolean, noms: { vendeur?: string; notaire?: string } = {}): string[] {
  const idx = ETAPES_DOSSIER.indexOf(d.statut);
  const suivante = ETAPES_DOSSIER[idx + 1];
  const vendeur = noms.vendeur ?? "vendeur";
  const notaire = noms.notaire ?? "notaire à mandater";
  const manque: string[] = [];
  if (d.incident) manque.push("Levée de l'incident en cours par le notaire");
  // Module cadastre en pause : l'étape ne peut pas dépendre d'une vérification que personne ne peut faire.
  if (suivante === "tf_verifie" && !tfVerifie && lireParametres().flags.cadastre) manque.push(`Vérification du Titre Foncier par le notaire (${notaire})`);
  if (suivante === "compromis_signe" && !offreAcceptee(d)) manque.push(attenteOffre(d, vendeur));
  if (suivante === "en_signature" && totalConfirme(d) === 0) {
    const declare = (d.paiements ?? []).some((p) => p.statut === "declare");
    manque.push(declare ? `Confirmation par le notaire (${notaire}) du versement déclaré` : `Versement de l'acompte par l'acheteur (${d.acheteurNom})`);
  }
  if (suivante === "actif" && !toutesSignatures(d)) {
    const libelles: Record<Signataire, string> = { notaire: `le notaire (${notaire})`, acheteur: `l'acheteur (${d.acheteurNom})`, vendeur: `le vendeur (${vendeur})` };
    const absents = SIGNATAIRES.filter((x) => !d.signatures?.[x]).map((x) => libelles[x]);
    manque.push(`Signature de l'acte par ${absents.join(" et ")}`);
  }
  return manque;
}

export function avancerEtape(dossierId: string): Dossier[] {
  const dossiers = majDossier(dossierId, (d) => {
    const idx = ETAPES_DOSSIER.indexOf(d.statut);
    const next = ETAPES_DOSSIER[Math.min(idx + 1, ETAPES_DOSSIER.length - 1)];
    const patch: Partial<Dossier> = {};
    if (next === "compromis_signe" && !d.dateCompromis) {
      patch.dateCompromis = new Date().toISOString();
    }
    // Le délai légal d'enregistrement court à partir de la signature de l'acte.
    if (next === "actif" && !d.dateLimiteDGID) {
      const limite = new Date();
      limite.setMonth(limite.getMonth() + lireParametres().moisEnregistrement);
      patch.dateActe = new Date().toISOString();
      patch.dateLimiteDGID = limite.toISOString();
    }
    return {
      ...d,
      ...patch,
      statut: next,
      evenements: [...d.evenements, evenement(`Étape : ${LABELS_ETAPE[next]}`)],
    };
  });
  const avance = dossiers.find((d) => d.id === dossierId);
  if (avance) popup.succes("Dossier avancé", `Nouvelle étape : ${LABELS_ETAPE[avance.statut]}.`);
  return dossiers;
}

export function joursRestantsDGID(d: Dossier): number | null {
  if (!d.dateLimiteDGID) return null;
  // Une fois enregistré, le délai n'a plus d'objet.
  if (ETAPES_DOSSIER.indexOf(d.statut) >= ETAPES_DOSSIER.indexOf("enregistre")) return null;
  const diff = new Date(d.dateLimiteDGID).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export type StatutVente = "disponible" | "sous_offre" | "vendu";

export const LABELS_VENTE: Record<StatutVente, string> = {
  disponible: "Disponible",
  sous_offre: "Sous offre",
  vendu: "Vendu",
};

export function statutVente(bienId: string, dossiers: Dossier[]): StatutVente {
  const lies = dossiers.filter((d) => d.bienId === bienId && d.incident !== "resilie");
  if (lies.some((d) => ETAPES_DOSSIER.indexOf(d.statut) >= ETAPES_DOSSIER.indexOf("actif"))) return "vendu";
  return lies.some((d) => offreAcceptee(d)) ? "sous_offre" : "disponible";
}

export type DocumentDossier = { nom: string; detail: string; disponible: boolean };

export function documentsDossier(d: Dossier, tfVerifie: boolean, numeroTF: string | null): DocumentDossier[] {
  const atteint = (e: StatutDossier) => ETAPES_DOSSIER.indexOf(d.statut) >= ETAPES_DOSSIER.indexOf(e);
  return [
    { nom: `Rapport de vérification TF ${numeroTF ?? ""}`.trim(), detail: tfVerifie ? "Disponible" : "En attente de vérification", disponible: tfVerifie },
    { nom: "Compromis de vente", detail: atteint("compromis_signe") ? "Signé" : "À signer chez le notaire", disponible: atteint("compromis_signe") },
    { nom: "Acte authentique de vente", detail: atteint("actif") ? "Signé par les parties" : "En attente de signature", disponible: atteint("actif") },
    { nom: "Reçu d'enregistrement DGID", detail: atteint("enregistre") ? "Reçu" : "Après enregistrement", disponible: atteint("enregistre") },
    { nom: "Nouveau Titre Foncier", detail: atteint("mute") ? "Muté au nom de l'acheteur" : "15–30 jours après enregistrement", disponible: atteint("mute") },
  ];
}

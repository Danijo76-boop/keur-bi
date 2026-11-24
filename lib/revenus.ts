"use client";
import { lire, ecrire, nouvelId } from "./stockage";
import { popup } from "./popup";
import { Bien } from "./mock-data";
import { Dossier, ETAPES_DOSSIER, prixRetenu } from "./dossiers";
import { Parametres, commissionVente } from "./parametres";
import { PlanId, Utilisateur } from "./utilisateurs";
import { MetaAnnonce } from "./annonces";
import { DemandeTF } from "./tf";
import { revenusPublicite, StatsCampagne } from "./publicite";

/* ── Services à la carte ──
   Les prix sont des hypothèses de départ, à ajuster avec les prestataires réels. */
export type Service = {
  id: string;
  titre: string;
  desc: string;
  prix: number;
  pour: "Acheteur" | "Vendeur" | "Tous";
  inclus: string[];
};

export const SERVICES: Service[] = [
  {
    id: "rapport_tf",
    titre: "Rapport complet du Titre Foncier",
    desc: "Un notaire partenaire contrôle le titre et vous remet un rapport écrit avant toute offre.",
    prix: 15000,
    pour: "Acheteur",
    inclus: ["Authenticité du titre", "Hypothèques et litiges", "Concordance du propriétaire"],
  },
  {
    id: "visite_accompagnee",
    titre: "Visite accompagnée par un expert",
    desc: "Un professionnel visite le bien avec vous et relève les points à vérifier.",
    prix: 20000,
    pour: "Acheteur",
    inclus: ["Visite sur place", "Compte rendu sous 48 h", "Estimation des travaux"],
  },
  {
    id: "bornage",
    titre: "Bornage par un géomètre",
    desc: "Mise en relation avec un géomètre agréé pour confirmer les limites et la superficie du terrain.",
    prix: 25000,
    pour: "Tous",
    inclus: ["Géomètre agréé", "Plan de bornage", "Vérification de la superficie"],
  },
  {
    id: "photos_pro",
    titre: "Reportage photo professionnel",
    desc: "Des photos soignées pour que votre annonce se démarque et se vende plus vite.",
    prix: 35000,
    pour: "Vendeur",
    inclus: ["15 photos retouchées", "Prise de vue par drone pour les terrains", "Livraison sous 72 h"],
  },
  {
    id: "estimation_certifiee",
    titre: "Estimation certifiée",
    desc: "Un expert immobilier évalue votre bien sur place et signe un avis de valeur.",
    prix: 50000,
    pour: "Vendeur",
    inclus: ["Visite de l'expert", "Avis de valeur signé", "Comparaison avec le marché"],
  },
  {
    id: "pack_diaspora",
    titre: "Pack Diaspora",
    desc: "Achetez depuis l'étranger : nous vous représentons sur place à chaque étape.",
    prix: 150000,
    pour: "Acheteur",
    inclus: ["Visite en vidéo en direct", "Aide à la procuration notariée", "Conseiller dédié jusqu'à l'acte"],
  },
];

export type Commande = {
  id: string;
  serviceId: string;
  montant: number;
  nom: string;
  telephone: string;
  email?: string;
  bienId?: string;
  note?: string;
  date: string;
  statut: "nouvelle" | "traitee";
};

const CLE_COMMANDES = "keurbi_commandes";

export function lireCommandes(): Commande[] {
  return lire<Commande[]>(CLE_COMMANDES, []);
}

export function commander(c: Omit<Commande, "id" | "date" | "statut" | "montant">) {
  const service = SERVICES.find((s) => s.id === c.serviceId);
  if (!service) return;
  ecrire(CLE_COMMANDES, [{ ...c, id: nouvelId(), montant: service.prix, date: new Date().toISOString(), statut: "nouvelle" }, ...lireCommandes()]);
  popup.succes("Commande enregistrée", `${service.titre}. Un conseiller vous rappelle pour le paiement et le rendez-vous.`);
}

export function traiterCommande(id: string) {
  ecrire(
    CLE_COMMANDES,
    lireCommandes().map((c) => (c.id === id ? { ...c, statut: "traitee" } : c)),
  );
  popup.succes("Commande marquée comme traitée");
}

/* ── Financement : mise en relation avec des banques partenaires ──
   Les établissements et les taux ci-dessous sont des exemples fictifs pour la démonstration. */
export type OffreFinancement = { id: string; nom: string; taux: number; dureeMax: number; apportMin: number; atout: string };

export const OFFRES_FINANCEMENT: OffreFinancement[] = [
  { id: "banque_a", nom: "Banque partenaire A", taux: 7.5, dureeMax: 20, apportMin: 20, atout: "Réponse de principe sous 72 h" },
  { id: "banque_b", nom: "Banque partenaire B", taux: 8, dureeMax: 25, apportMin: 10, atout: "Apport réduit, durée longue" },
  { id: "banque_c", nom: "Banque partenaire C", taux: 8.5, dureeMax: 15, apportMin: 15, atout: "Offre dédiée à la diaspora" },
];

// Rémunération versée par la banque pour chaque demande qualifiée transmise (hypothèse).
export const PRIX_LEAD = 10000;

export type DemandeFinancement = {
  id: string;
  offreId: string;
  nom: string;
  telephone: string;
  montant: number;
  duree: number;
  revenu?: number;
  date: string;
  statut: "nouvelle" | "transmise";
};

const CLE_LEADS = "keurbi_financement";

export function lireDemandesFinancement(): DemandeFinancement[] {
  return lire<DemandeFinancement[]>(CLE_LEADS, []);
}

export function demanderFinancement(d: Omit<DemandeFinancement, "id" | "date" | "statut">) {
  ecrire(CLE_LEADS, [{ ...d, id: nouvelId(), date: new Date().toISOString(), statut: "nouvelle" }, ...lireDemandesFinancement()]);
  popup.succes("Demande envoyée", "Un conseiller de la banque vous rappelle sous 72 h. Cette demande ne vous engage pas.");
}

export function transmettreDemande(id: string) {
  ecrire(
    CLE_LEADS,
    lireDemandesFinancement().map((d) => (d.id === id ? { ...d, statut: "transmise" } : d)),
  );
  popup.succes("Demande transmise à la banque");
}

/* ── Lettre d'information ── */
const CLE_NEWSLETTER = "keurbi_newsletter";

export function lireAbonnesNewsletter(): string[] {
  return lire<string[]>(CLE_NEWSLETTER, []);
}

export function inscrireNewsletter(email: string) {
  const adresse = email.trim().toLowerCase();
  const abonnes = lireAbonnesNewsletter();
  if (abonnes.includes(adresse)) return popup.info("Vous êtes déjà inscrit(e)", adresse);
  ecrire(CLE_NEWSLETTER, [adresse, ...abonnes]);
  popup.succes("Inscription confirmée", "Vous recevrez les nouvelles annonces et les tendances du marché.");
}

/* ── Synthèse des revenus ── */
export const PRIX_PLANS: Record<PlanId, number> = { gratuit: 0, pro: 29000, promoteur: 89000, essentiel: 50000, pro_notaire: 120000 };

export type LigneRevenu = { id: string; label: string; detail: string; montant: number; recurrent?: boolean };

export function calculerRevenus(src: {
  dossiers: Dossier[];
  biens: Bien[];
  utilisateurs: Utilisateur[];
  metas: Record<string, MetaAnnonce>;
  demandesTF: DemandeTF[];
  commandes: Commande[];
  leads: DemandeFinancement[];
  publicite: Record<string, StatsCampagne>;
  p: Parametres;
}): LigneRevenu[] {
  const indexActe = ETAPES_DOSSIER.indexOf("actif");
  const conclus = src.dossiers.filter((d) => ETAPES_DOSSIER.indexOf(d.statut) >= indexActe && !d.incident);
  const commissions = conclus.reduce((s, d) => {
    const bien = src.biens.find((b) => b.id === d.bienId);
    return bien ? s + commissionVente(prixRetenu(d, bien), src.p) : s;
  }, 0);
  const abonnes = src.utilisateurs.filter((u) => u.plan && PRIX_PLANS[u.plan] > 0);
  const boosts = Object.values(src.metas).filter((m) => m.boostJusquau).length;
  const tfPrioritaires = src.demandesTF.filter((d) => d.prioritaire).length;
  return [
    {
      id: "commissions",
      label: "Commissions sur ventes",
      detail: `${conclus.length} acte(s) signé(s), taux de référence ${src.p.tauxCommission} %`,
      montant: commissions,
    },
    {
      id: "abonnements",
      label: "Abonnements agences et notaires",
      detail: `${abonnes.length} abonné(s) payant(s), par mois`,
      montant: abonnes.reduce((s, u) => s + PRIX_PLANS[u.plan!], 0),
      recurrent: true,
    },
    { id: "boosts", label: "Annonces boostées", detail: `${boosts} boost(s)`, montant: boosts * src.p.prixBoost },
    { id: "tf", label: "Vérifications TF prioritaires", detail: `${tfPrioritaires} demande(s)`, montant: tfPrioritaires * src.p.prixTFPrioritaire },
    { id: "services", label: "Services à la carte", detail: `${src.commandes.length} commande(s)`, montant: src.commandes.reduce((s, c) => s + c.montant, 0) },
    {
      id: "publicite",
      label: "Publicité partenaires",
      detail: `${Object.values(src.publicite).reduce((s, c) => s + c.clics, 0)} clic(s) facturé(s)`,
      montant: revenusPublicite(src.publicite),
    },
    { id: "leads", label: "Mises en relation bancaires", detail: `${src.leads.length} demande(s) de financement`, montant: src.leads.length * PRIX_LEAD },
  ];
}

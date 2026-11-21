"use client";
import { lire, ecrire, useStocke } from "./stockage";
import { popup } from "./popup";
import { Role } from "./auth";

export type Permission = {
  id: string;
  groupe: string;
  label: string;
  desc: string;
  roles: Role[];
  // Vrai si la permission bloque réellement l'action dans l'application.
  appliquee?: boolean;
};

export const PERMISSIONS: Permission[] = [
  { id: "annonce_consulter", groupe: "Annonces & Terrains", label: "Consulter les annonces", desc: "Accès à la liste et au détail des annonces publiées", roles: ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "moderateur", "admin"] },
  { id: "annonce_publier", groupe: "Annonces & Terrains", label: "Publier une annonce", desc: "Créer et mettre en ligne une annonce immobilière", roles: ["vendeur", "agence", "agent", "admin"], appliquee: true },
  { id: "annonce_modifier", groupe: "Annonces & Terrains", label: "Modifier / supprimer une annonce", desc: "Éditer ou retirer ses propres annonces", roles: ["vendeur", "agence", "agent", "admin"], appliquee: true },
  { id: "annonce_booster", groupe: "Annonces & Terrains", label: "Booster une annonce", desc: "Payer pour mettre une annonce en avant", roles: ["vendeur", "agence", "admin"], appliquee: true },
  { id: "offre_soumettre", groupe: "Offres & Négociation", label: "Soumettre une offre d'achat", desc: "Envoyer une proposition de prix au vendeur", roles: ["acheteur", "admin"], appliquee: true },
  { id: "offre_repondre", groupe: "Offres & Négociation", label: "Accepter / refuser / contre-proposer", desc: "Répondre à une offre reçue sur une annonce", roles: ["vendeur", "agence", "agent", "admin"], appliquee: true },
  { id: "offre_historique", groupe: "Offres & Négociation", label: "Consulter l'historique des offres", desc: "Voir toutes les offres liées à un dossier", roles: ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "admin"] },
  { id: "dossier_creer", groupe: "Contrats & Dossiers", label: "Créer un dossier de vente", desc: "Ouvrir un nouveau dossier de vente", roles: ["notaire", "clerc", "admin"], appliquee: true },
  { id: "dossier_consulter", groupe: "Contrats & Dossiers", label: "Consulter son dossier", desc: "Voir l'état d'avancement du dossier dont on est partie", roles: ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "admin"] },
  { id: "dossier_documents", groupe: "Contrats & Dossiers", label: "Uploader des documents", desc: "Déposer des pièces justificatives dans un dossier", roles: ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "admin"], appliquee: true },
  { id: "dossier_avancer", groupe: "Contrats & Dossiers", label: "Faire avancer le statut du contrat", desc: "Changer l'état du dossier dans la machine à états", roles: ["notaire", "admin"], appliquee: true },
  { id: "tf_soumettre", groupe: "TF & DGID", label: "Soumettre une vérification TF", desc: "Envoyer un numéro de TF à vérifier", roles: ["notaire", "clerc", "admin"], appliquee: true },
  { id: "tf_consulter", groupe: "TF & DGID", label: "Consulter le statut TF d'une annonce", desc: "Voir le badge TF (Vérifié / En vérif / Non vérifié)", roles: ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "moderateur", "admin"] },
  { id: "tf_enregistrement", groupe: "TF & DGID", label: "Déclencher l'enregistrement DGID", desc: "Initier la procédure d'enregistrement après signature", roles: ["notaire", "admin"], appliquee: true },
  { id: "admin_utilisateurs", groupe: "Administration & Paramètres", label: "Gérer les utilisateurs", desc: "Créer, suspendre, modifier les comptes", roles: ["admin"], appliquee: true },
  { id: "admin_roles", groupe: "Administration & Paramètres", label: "Affecter des rôles & habilitations", desc: "Modifier la matrice des permissions par rôle", roles: ["admin"], appliquee: true },
  { id: "admin_parametres", groupe: "Administration & Paramètres", label: "Modifier les paramètres plateforme", desc: "Changer taux, délais, fonctionnalités", roles: ["admin"], appliquee: true },
  { id: "admin_rapports", groupe: "Administration & Paramètres", label: "Consulter les rapports & statistiques", desc: "Accès à la vue d'ensemble, au reporting et au journal d'activité", roles: ["admin"], appliquee: true },
  { id: "admin_kyc", groupe: "Administration & Paramètres", label: "Valider KYC", desc: "Approuver ou rejeter les dossiers d'identité", roles: ["moderateur", "admin"], appliquee: true },
  { id: "admin_moderation", groupe: "Administration & Paramètres", label: "Modérer les annonces", desc: "Traiter les signalements, retirer ou republier une annonce", roles: ["moderateur", "admin"], appliquee: true },
];

export type Matrice = Record<string, Role[]>;

const CLE = "keurbi_permissions_v2";

export const MATRICE_DEFAUT: Matrice = Object.fromEntries(PERMISSIONS.map((p) => [p.id, p.roles]));

export function lireMatrice(): Matrice {
  return { ...MATRICE_DEFAUT, ...lire<Matrice>(CLE, {}) };
}

export function sauvegarderMatrice(m: Matrice) {
  popup.succes("Matrice des habilitations enregistrée");
  ecrire(CLE, m);
}

export function useMatrice(): Matrice {
  return useStocke(lireMatrice, MATRICE_DEFAUT);
}

// Sections de l'espace d'administration et permissions qui ouvrent chacune.
export const SECTIONS_ADMIN: { href: string; permissions: string[] }[] = [
  { href: "/admin", permissions: ["admin_rapports"] },
  { href: "/admin/utilisateurs", permissions: ["admin_utilisateurs", "admin_kyc"] },
  { href: "/admin/moderation", permissions: ["admin_moderation"] },
  { href: "/admin/roles", permissions: ["admin_roles"] },
  { href: "/admin/parametres", permissions: ["admin_parametres"] },
  { href: "/admin/reporting", permissions: ["admin_rapports"] },
  { href: "/admin/revenus", permissions: ["admin_rapports"] },
  { href: "/admin/journal", permissions: ["admin_rapports"] },
  // Détails techniques : administrateurs seulement (le serveur le vérifie aussi).
  { href: "/admin/journal-technique", permissions: ["admin_parametres"] },
];

export function peut(matrice: Matrice, role: Role | undefined, permission: string): boolean {
  return !!role && (matrice[permission] ?? []).includes(role);
}

export function sectionsAdminOuvertes(matrice: Matrice, role: Role | undefined): string[] {
  return SECTIONS_ADMIN.filter((s) => s.permissions.some((p) => peut(matrice, role, p))).map((s) => s.href);
}

export function usePeut(role: Role | undefined, permission: string): boolean {
  const matrice = useMatrice();
  return !!role && (matrice[permission] ?? []).includes(role);
}

"use client";
import { lire, ecrire } from "./stockage";
import { popup } from "./popup";
import { Role, User } from "./auth";

export type PlanId = "gratuit" | "pro" | "promoteur" | "essentiel" | "pro_notaire";

// Un particulier vend son propre bien : deux annonces suffisent, sans abonnement.
export const QUOTA_PARTICULIER = 2;

export const QUOTA_ANNONCES: Partial<Record<PlanId, number>> = { gratuit: 1, pro: 5, promoteur: Infinity };

export type StatutKYC = "non_soumis" | "en_attente" | "verifie" | "rejete";

export const LABELS_KYC: Record<StatutKYC, string> = {
  non_soumis: "Non soumis",
  en_attente: "⏳ En attente",
  verifie: "✓ Vérifié",
  rejete: "✗ Rejeté",
};

// Seuls les noms de fichiers sont conservés : aucune pièce d'identité n'est stockée dans le navigateur.
export type DossierKYC = {
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  typeDocument?: string;
  numeroDocument?: string;
  recto?: string;
  verso?: string;
  selfie?: string;
  justificatif?: string;
  soumisLe?: string;
  motifRejet?: string;
};

export type Utilisateur = {
  email: string;
  nom: string;
  role: Role;
  telephone?: string;
  ville?: string;
  suspendu?: boolean;
  statutKYC: StatutKYC;
  plan?: PlanId;
  kyc?: DossierKYC;
  releveBancaire?: string;
  // Agence (agent) ou étude notariale (clerc) pour laquelle la personne travaille.
  rattachement?: string;
  inscritLe: string;
  derniereConnexion?: string;
};

const CLE = "keurbi_utilisateurs";

export const COMPTES_DEMO: Utilisateur[] = [
  { email: "d.badiane@exemple.sn", nom: "Daniel Badiane", role: "acheteur", telephone: "+221 77 123 45 67", ville: "Dakar", statutKYC: "verifie", inscritLe: "2026-09-05T10:00:00.000Z" },
  { email: "m.sarr@exemple.sn", nom: "Moussa Sarr", role: "agence", telephone: "+221 77 987 65 43", ville: "Thiès", statutKYC: "verifie", inscritLe: "2026-10-02T10:00:00.000Z" },
  { email: "a.diallo@exemple.sn", nom: "Me. Amadou Diallo", role: "notaire", ville: "Dakar", statutKYC: "verifie", inscritLe: "2026-08-15T10:00:00.000Z" },
  { email: "f.ndiaye@exemple.sn", nom: "Fatou Ndiaye", role: "acheteur", telephone: "+221 76 543 21 09", statutKYC: "en_attente", kyc: { typeDocument: "Carte Nationale d'Identité", recto: "cni_recto.jpg", verso: "cni_verso.jpg", soumisLe: "2026-10-13T10:00:00.000Z" }, inscritLe: "2026-10-13T09:00:00.000Z" },
  { email: "a.ba@exemple.sn", nom: "Aïssatou Ba", role: "vendeur", telephone: "+221 70 111 22 33", ville: "Mbour", statutKYC: "verifie", inscritLe: "2026-10-20T10:00:00.000Z" },
  { email: "c.gueye@exemple.sn", nom: "Cheikh Gueye", role: "agent", rattachement: "Foncier Plus Immobilier", ville: "Dakar", statutKYC: "verifie", inscritLe: "2026-10-08T10:00:00.000Z" },
  { email: "n.sow@exemple.sn", nom: "Ndèye Sow", role: "clerc", rattachement: "Étude Diallo", ville: "Dakar", statutKYC: "verifie", inscritLe: "2026-09-12T10:00:00.000Z" },
  { email: "o.kane@exemple.sn", nom: "Oumar Kane", role: "moderateur", ville: "Dakar", statutKYC: "verifie", inscritLe: "2026-08-20T10:00:00.000Z" },
  { email: "i.fall@exemple.sn", nom: "Ibrahima Fall", role: "agence", suspendu: true, statutKYC: "non_soumis", inscritLe: "2026-09-01T10:00:00.000Z" },
];

export function lireUtilisateurs(): Utilisateur[] {
  return lire<Utilisateur[]>(CLE, COMPTES_DEMO);
}

function sauvegarder(u: Utilisateur[]) {
  ecrire(CLE, u);
}

export function trouverUtilisateur(email: string): Utilisateur | undefined {
  return lireUtilisateurs().find((u) => u.email === email);
}

export function enregistrerConnexion(user: User, telephone?: string) {
  const tous = lireUtilisateurs();
  const maintenant = new Date().toISOString();
  if (tous.some((u) => u.email === user.email)) {
    sauvegarder(tous.map((u) => (u.email === user.email ? { ...u, role: user.role, derniereConnexion: maintenant } : u)));
  } else {
    sauvegarder([
      { email: user.email, nom: user.nom, role: user.role, telephone, statutKYC: "non_soumis", inscritLe: maintenant, derniereConnexion: maintenant },
      ...tous,
    ]);
  }
}

// Une session ouverte avant la création de l'annuaire doit y figurer, sinon ses mises à jour se perdent.
export function assurerUtilisateur(user: User) {
  if (!trouverUtilisateur(user.email)) enregistrerConnexion(user);
}

export function majUtilisateur(email: string, patch: Partial<Utilisateur>) {
  sauvegarder(lireUtilisateurs().map((u) => (u.email === email ? { ...u, ...patch } : u)));
}

export function ajouterUtilisateur(u: Utilisateur) {
  popup.succes("Utilisateur créé", u.nom);
  sauvegarder([u, ...lireUtilisateurs().filter((x) => x.email !== u.email)]);
}

// Répercute sur le serveur une décision d'administration (suspension, rôle), pour qu'elle s'applique à la vraie connexion.
// Un compte qui n'existe que dans l'annuaire de démonstration du navigateur est simplement ignoré (404).
export function majCompteServeur(email: string, patch: { suspendu?: boolean; role?: Role }) {
  fetch("/api/admin/utilisateurs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, ...patch }) })
    .then(async (r) => {
      if (r.ok || r.status === 404) return;
      const d = await r.json().catch(() => ({}));
      popup.erreur("Modification non appliquée au compte", d.erreur ?? "Le serveur a refusé la demande.");
    })
    .catch(() => popup.erreur("Modification non appliquée au compte", "Connexion au serveur impossible."));
}

export function soumettreKYC(email: string, kyc: DossierKYC) {
  popup.succes("Dossier d'identité envoyé", "Il sera examiné par notre équipe.");
  majUtilisateur(email, { statutKYC: "en_attente", kyc: { ...kyc, soumisLe: new Date().toISOString() } });
}

export function deciderKYC(email: string, statut: "verifie" | "rejete", motif?: string) {
  popup.succes(statut === "verifie" ? "KYC validé" : "KYC rejeté");
  const u = trouverUtilisateur(email);
  majUtilisateur(email, { statutKYC: statut, kyc: { ...u?.kyc, motifRejet: motif } });
}

export function detailScore(u: Utilisateur | undefined, transactions: number) {
  return [
    { label: "Email renseigné", points: 20, acquis: !!u?.email },
    { label: "Téléphone renseigné", points: 15, acquis: !!u?.telephone },
    { label: "Dossier KYC soumis", points: 20, acquis: !!u && u.statutKYC !== "non_soumis" && u.statutKYC !== "rejete" },
    { label: "Identité vérifiée", points: 20, acquis: u?.statutKYC === "verifie" },
    { label: "Relevé bancaire ajouté", points: 5, acquis: !!u?.releveBancaire },
    { label: "Transaction conclue", points: 20, acquis: transactions > 0 },
  ];
}

export function scoreConfiance(u: Utilisateur | undefined, transactions: number): number {
  return detailScore(u, transactions).reduce((s, l) => s + (l.acquis ? l.points : 0), 0);
}

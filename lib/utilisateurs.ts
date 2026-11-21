"use client";
import { signalerMaj } from "./stockage";
import { popup } from "./popup";
import { avecReference } from "./rapport-erreurs";
import { Role } from "./auth";

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

// Comptes d'exemple chargés dans la base par `npm run db:seed`.
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

/* ── Comptes ──
   Ils vivent dans la base. Le serveur n'envoie que ce que la personne connectée a le droit de voir :
   sa propre fiche, tous les comptes pour l'administration, les acheteurs pour le notariat.
   Cette copie en mémoire permet aux pages de les lire sans attendre ; chaque modification part au serveur. */
let comptes: Utilisateur[] = [];

export function lireUtilisateurs(): Utilisateur[] {
  return comptes;
}

export function trouverUtilisateur(email: string): Utilisateur | undefined {
  return comptes.find((u) => u.email === email);
}

export async function chargerUtilisateurs(): Promise<void> {
  try {
    const r = await fetch("/api/utilisateurs", { cache: "no-store" });
    comptes = r.ok ? ((await r.json()) as { utilisateurs: Utilisateur[] }).utilisateurs : [];
  } catch {
    comptes = [];
  }
  signalerMaj();
}

export function viderUtilisateurs() {
  comptes = [];
  signalerMaj();
}

async function envoyer(methode: "PATCH" | "POST", corps: unknown): Promise<{ ok: boolean; donnees: { utilisateur?: Utilisateur; motDePasseProvisoire?: string; erreur?: string } }> {
  try {
    const r = await fetch("/api/utilisateurs", { method: methode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const donnees = await r.json().catch(() => ({}));
    if (r.status >= 500) donnees.erreur = avecReference(donnees.erreur ?? "Le service est momentanément indisponible.", r);
    return { ok: r.ok, donnees };
  } catch {
    return { ok: false, donnees: { erreur: "Connexion au serveur impossible." } };
  }
}

// La modification s'affiche tout de suite, puis le serveur la confirme. S'il la refuse, l'affichage revient à l'état réel.
export function majUtilisateur(email: string, patch: Partial<Utilisateur>) {
  comptes = comptes.map((u) => (u.email === email ? { ...u, ...patch } : u));
  signalerMaj();
  envoyer("PATCH", { email, patch }).then(({ ok, donnees }) => {
    if (ok && donnees.utilisateur) {
      const confirme = donnees.utilisateur;
      comptes = comptes.map((u) => (u.email === email ? confirme : u));
      signalerMaj();
    } else {
      popup.erreur("Modification non enregistrée", donnees.erreur ?? "Le serveur a refusé la demande.");
      chargerUtilisateurs();
    }
  });
}

// Création d'un compte par un administrateur. Le mot de passe provisoire n'est affiché qu'une fois.
export async function ajouterUtilisateur(u: Pick<Utilisateur, "email" | "nom" | "role" | "telephone" | "statutKYC" | "suspendu">): Promise<boolean> {
  const { ok, donnees } = await envoyer("POST", u);
  if (!ok || !donnees.utilisateur) {
    popup.erreur("Compte non créé", donnees.erreur ?? "Le serveur a refusé la demande.");
    return false;
  }
  comptes = [donnees.utilisateur, ...comptes.filter((x) => x.email !== u.email)];
  signalerMaj();
  popup.succes("Utilisateur créé", `${u.nom} · mot de passe provisoire : ${donnees.motDePasseProvisoire}. Notez-le et transmettez-le : il ne sera plus affiché.`);
  return true;
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

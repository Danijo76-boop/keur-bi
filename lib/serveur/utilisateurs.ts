import "server-only";
import type { DossierKYC as LigneKYC, Utilisateur as LigneUtilisateur } from "@prisma/client";
import type { DossierKYC, Utilisateur } from "@/lib/utilisateurs";

type LigneAvecKYC = LigneUtilisateur & { kyc: LigneKYC | null };

const jour = (d: Date | null) => d?.toISOString().slice(0, 10);

function versKYC(k: LigneKYC): DossierKYC {
  return {
    dateNaissance: jour(k.dateNaissance),
    lieuNaissance: k.lieuNaissance ?? undefined,
    nationalite: k.nationalite ?? undefined,
    typeDocument: k.typeDocument ?? undefined,
    numeroDocument: k.numeroDocument ?? undefined,
    recto: k.recto ?? undefined,
    verso: k.verso ?? undefined,
    selfie: k.selfie ?? undefined,
    justificatif: k.justificatif ?? undefined,
    soumisLe: k.soumisLe?.toISOString(),
    motifRejet: k.motifRejet ?? undefined,
  };
}

// Fiche complète, telle que les pages l'attendent. Ne contient jamais l'empreinte du mot de passe.
export function versUtilisateur(u: LigneAvecKYC): Utilisateur {
  return {
    email: u.email,
    nom: u.nom,
    role: u.role,
    telephone: u.telephone ?? undefined,
    ville: u.ville ?? undefined,
    suspendu: u.suspendu || undefined,
    statutKYC: u.statutKYC,
    plan: u.plan ?? undefined,
    kyc: u.kyc ? versKYC(u.kyc) : undefined,
    releveBancaire: u.releveBancaire ?? undefined,
    rattachement: u.rattachement ?? undefined,
    inscritLe: u.inscritLe.toISOString(),
    derniereConnexion: u.derniereConnexion?.toISOString(),
  };
}

// Fiche réduite : ce qu'un notaire a besoin de voir d'un acheteur pour lui ouvrir un dossier.
export function versUtilisateurReduit(u: LigneUtilisateur): Utilisateur {
  return { email: u.email, nom: u.nom, role: u.role, statutKYC: u.statutKYC, inscritLe: u.inscritLe.toISOString() };
}

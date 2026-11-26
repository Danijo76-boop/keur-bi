/* ── Profils demandés à l'inscription et leurs champs obligatoires ──
   Partagé par le formulaire (navigateur) et le serveur, qui refait toutes les vérifications.
   Le compte démarre toujours en « acheteur » ; un administrateur active le profil demandé après contrôle. */

export type ProfilDemandable = "acheteur" | "vendeur" | "agence" | "agent" | "notaire" | "clerc";

export type ChampProfil = {
  cle: string;
  libelle: string;
  exemple: string;
  aide?: string;
  // Renvoie un message d'erreur, ou null si la valeur convient (déjà débarrassée des espaces autour).
  verifier?: (v: string) => string | null;
};

const longueur = (min: number, max: number, quoi: string) => (v: string) =>
  v.length < min ? `${quoi} : ${min} caractères au minimum.` : v.length > max ? `${quoi} : ${max} caractères au maximum.` : null;

// NINEA : identifiant fiscal sénégalais, 7 à 9 chiffres, souvent suivi d'un code (ex. 005123456 2G3).
const ninea = (v: string) => (/^\d{7,9}[ ]?[0-9A-Z]{0,4}$/i.test(v.replace(/\s+/g, " ").trim()) ? null : "NINEA invalide (ex. 005123456 2G3).");
// RCCM : registre du commerce, ex. SN-DKR-2020-B-12345.
const rccm = (v: string) => (/^SN[-\s.]?[A-Z]{2,4}[-\s.]?\d{4}[-\s.]?[A-Z][-\s.]?\d{1,6}$/i.test(v.trim()) ? null : "RCCM invalide (ex. SN-DKR-2020-B-12345).");
// Pièce d'identité : CNI sénégalaise (13 à 17 chiffres) ou passeport (lettres et chiffres).
const piece = (v: string) => (/^[A-Z0-9]{6,17}$/i.test(v.replace(/\s/g, "")) ? null : "Numéro de pièce invalide (CNI ou passeport, sans espaces).");

export const PROFILS: Record<ProfilDemandable, { libelle: string; description: string; champs: ChampProfil[] }> = {
  acheteur: {
    libelle: "Acheteur ou locataire",
    description: "Chercher un bien, faire une offre, demander une visite.",
    champs: [],
  },
  vendeur: {
    libelle: "Vendeur particulier",
    description: "Vendre ou louer votre propre bien.",
    champs: [
      { cle: "ville", libelle: "Ville", exemple: "Dakar", verifier: longueur(2, 80, "Ville") },
      { cle: "numeroPiece", libelle: "N° de pièce d'identité (CNI ou passeport)", exemple: "1751198700123", verifier: piece },
    ],
  },
  agence: {
    libelle: "Agence immobilière",
    description: "Publier les biens de votre agence et gérer vos agents.",
    champs: [
      { cle: "nomAgence", libelle: "Nom de l'agence", exemple: "Foncier Plus Immobilier", verifier: longueur(2, 120, "Nom de l'agence") },
      { cle: "ninea", libelle: "NINEA", exemple: "005123456 2G3", aide: "Numéro d'identification fiscale", verifier: ninea },
      { cle: "rccm", libelle: "RCCM", exemple: "SN-DKR-2020-B-12345", aide: "Registre du commerce", verifier: rccm },
      { cle: "adresse", libelle: "Adresse de l'agence", exemple: "Rue 10, Point E, Dakar", verifier: longueur(5, 200, "Adresse") },
    ],
  },
  agent: {
    libelle: "Agent d'agence",
    description: "Travailler pour une agence déjà inscrite.",
    champs: [{ cle: "agenceRattachement", libelle: "Agence de rattachement", exemple: "Foncier Plus Immobilier", verifier: longueur(2, 120, "Agence") }],
  },
  notaire: {
    libelle: "Notaire",
    description: "Suivre les dossiers de vente et les actes.",
    champs: [
      {
        cle: "numeroChambre",
        libelle: "N° d'inscription à la Chambre des notaires",
        exemple: "CNS-0123",
        verifier: longueur(2, 40, "N° d'inscription"),
      },
      { cle: "etude", libelle: "Nom de l'étude", exemple: "Étude Me Diallo", verifier: longueur(2, 120, "Étude") },
      { cle: "ville", libelle: "Ville", exemple: "Dakar", verifier: longueur(2, 80, "Ville") },
    ],
  },
  clerc: {
    libelle: "Clerc de notaire",
    description: "Assister une étude notariale.",
    champs: [{ cle: "etudeRattachement", libelle: "Étude de rattachement", exemple: "Étude Me Diallo", verifier: longueur(2, 120, "Étude") }],
  },
};

export const PROFILS_DEMANDABLES = Object.keys(PROFILS) as ProfilDemandable[];

export const estProfilDemandable = (v: unknown): v is ProfilDemandable => typeof v === "string" && v in PROFILS;

// Vérifie les champs d'un profil. Renvoie les erreurs par champ (vide si tout va bien) et les valeurs nettoyées.
export function verifierInfosProfil(profil: ProfilDemandable, brut: unknown): { erreurs: Record<string, string>; infos: Record<string, string> } {
  const source = brut && typeof brut === "object" ? (brut as Record<string, unknown>) : {};
  const erreurs: Record<string, string> = {};
  const infos: Record<string, string> = {};
  for (const champ of PROFILS[profil].champs) {
    const v = typeof source[champ.cle] === "string" ? (source[champ.cle] as string).trim().slice(0, 300) : "";
    if (!v) {
      erreurs[champ.cle] = `${champ.libelle} : champ obligatoire.`;
      continue;
    }
    const probleme = champ.verifier?.(v);
    if (probleme) erreurs[champ.cle] = probleme;
    else infos[champ.cle] = v;
  }
  return { erreurs, infos };
}

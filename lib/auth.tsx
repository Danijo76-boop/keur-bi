"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { chargerUtilisateurs, viderUtilisateurs } from "./utilisateurs";
import { avecReference } from "./rapport-erreurs";
import { chargerBiensBase } from "./annonces";
import { chargerAlertes, viderAlertes } from "./preferences";

export type Role = "acheteur" | "vendeur" | "agence" | "agent" | "notaire" | "clerc" | "moderateur" | "admin";
export type User = { nom: string; email: string; role: Role };

export const ROLES: Role[] = ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "moderateur", "admin"];

// Rôles qu'une personne peut choisir elle-même à l'inscription. Modérateur et admin sont attribués par un administrateur.
export const ROLES_INSCRIPTION: Role[] = ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc"];

export const LONGUEUR_MIN_MOT_DE_PASSE = 8;

export const ROLE_LABELS: Record<Role, string> = {
  acheteur: "Acheteur",
  vendeur: "Vendeur particulier",
  agence: "Agence",
  agent: "Agent d'agence",
  notaire: "Notaire",
  clerc: "Clerc de notaire",
  moderateur: "Modérateur",
  admin: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  acheteur: "Je cherche un bien",
  vendeur: "Je vends mon propre bien",
  agence: "Je gère une agence ou des programmes",
  agent: "Je travaille pour une agence",
  notaire: "Je signe et j'enregistre les actes",
  clerc: "Je prépare les dossiers d'une étude",
  moderateur: "Je valide les comptes et les annonces",
  admin: "J'administre la plateforme",
};

// Les rôles se regroupent par côté de la transaction : les écrans raisonnent d'abord sur cette famille,
// et les différences fines (signer, booster, valider) passent par la matrice des habilitations.
export type Famille = "acheteur" | "vendeur" | "notariat" | "plateforme";

const FAMILLES: Record<Role, Famille> = {
  acheteur: "acheteur",
  vendeur: "vendeur",
  agence: "vendeur",
  agent: "vendeur",
  notaire: "notariat",
  clerc: "notariat",
  moderateur: "plateforme",
  admin: "plateforme",
};

export function famille(role: Role | undefined): Famille | undefined {
  return role ? FAMILLES[role] : undefined;
}

export const estCoteVendeur = (role: Role | undefined) => famille(role) === "vendeur";
export const estNotariat = (role: Role | undefined) => famille(role) === "notariat";
export const estPlateforme = (role: Role | undefined) => famille(role) === "plateforme";

export type ResultatAuth = { ok: true } | { ok: false; erreur: string };
export type DonneesInscription = { nom: string; email: string; motDePasse: string; role: Role; telephone?: string };

type AuthContextValue = {
  user: User | null;
  pret: boolean;
  connexion: (email: string, motDePasse: string) => Promise<ResultatAuth>;
  inscription: (d: DonneesInscription) => Promise<ResultatAuth>;
  majProfil: (patch: { nom?: string; telephone?: string; ville?: string }) => Promise<ResultatAuth>;
  logout: () => Promise<void>;
};

// Copie locale du compte connecté, lue par quelques modules (journal). Elle ne donne aucun droit :
// la session réelle est un cookie que seul le serveur peut lire et vérifier.
const STORAGE_KEY = "keurbi_user";
const AuthContext = createContext<AuthContextValue | null>(null);

async function appeler(url: string, methode: "POST" | "PATCH", corps?: unknown): Promise<{ ok: boolean; donnees: { utilisateur?: User; erreur?: string } }> {
  try {
    const r = await fetch(url, { method: methode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps ?? {}) });
    const donnees = await r.json().catch(() => ({}));
    if (r.status >= 500) donnees.erreur = avecReference(donnees.erreur ?? "Le service est momentanément indisponible.", r);
    return { ok: r.ok, donnees };
  } catch {
    return { ok: false, donnees: { erreur: "Connexion au serveur impossible. Vérifiez votre accès Internet." } };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pret, setPret] = useState(false);

  function appliquer(u: User | null) {
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify({ nom: u.nom, email: u.email, role: u.role }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible : sans conséquence sur la session */
    }
    setUser(u ? { nom: u.nom, email: u.email, role: u.role } : null);
    if (u) {
      chargerUtilisateurs();
      chargerAlertes();
    } else {
      viderUtilisateurs();
      viderAlertes();
    }
    // Un vendeur voit en plus ses annonces retirées, la modération les voit toutes.
    chargerBiensBase(true);
  }

  useEffect(() => {
    fetch("/api/auth/moi", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { utilisateur: null }))
      .then((d: { utilisateur: User | null }) => appliquer(d.utilisateur))
      .catch(() => appliquer(null))
      .finally(() => setPret(true));
  }, []);

  async function ouvrir(url: string, corps: unknown): Promise<ResultatAuth> {
    const { ok, donnees } = await appeler(url, "POST", corps);
    if (!ok || !donnees.utilisateur) return { ok: false, erreur: donnees.erreur ?? "Une erreur est survenue. Réessayez." };
    appliquer(donnees.utilisateur);
    return { ok: true };
  }

  const connexion = (email: string, motDePasse: string) => ouvrir("/api/auth/connexion", { email, motDePasse });
  const inscription = (d: DonneesInscription) => ouvrir("/api/auth/inscription", d);

  async function majProfil(patch: { nom?: string; telephone?: string; ville?: string }): Promise<ResultatAuth> {
    const { ok, donnees } = await appeler("/api/auth/moi", "PATCH", patch);
    if (!ok || !donnees.utilisateur) return { ok: false, erreur: donnees.erreur ?? "Une erreur est survenue. Réessayez." };
    appliquer(donnees.utilisateur);
    return { ok: true };
  }

  async function logout() {
    await appeler("/api/auth/deconnexion", "POST");
    appliquer(null);
  }

  return <AuthContext.Provider value={{ user, pret, connexion, inscription, majProfil, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}

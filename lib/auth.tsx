"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { assurerUtilisateur } from "./utilisateurs";

export type Role = "acheteur" | "vendeur" | "agence" | "agent" | "notaire" | "clerc" | "moderateur" | "admin";
export type User = { nom: string; email: string; role: Role };

export const ROLES: Role[] = ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc", "moderateur", "admin"];

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

type AuthContextValue = {
  user: User | null;
  pret: boolean;
  login: (user: User) => void;
  logout: () => void;
};

const STORAGE_KEY = "keurbi_user";
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stocke: User = JSON.parse(raw);
        assurerUtilisateur(stocke);
        setUser(stocke);
      }
    } catch {
      /* ignore */
    }
    setPret(true);
  }, []);

  function login(u: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, pret, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}

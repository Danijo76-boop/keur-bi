import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import type { Role, Utilisateur } from "@prisma/client";
import { db } from "./db";

/* ── Comptes et sessions ──
   Le mot de passe n'est jamais stocké : seule son empreinte bcrypt l'est.
   À la connexion, le navigateur reçoit un jeton aléatoire dans un cookie illisible par JavaScript ;
   la base n'en garde que l'empreinte, si bien qu'une fuite de la base ne permet pas d'ouvrir une session. */

export const COOKIE_SESSION = "keurbi_session";
const DUREE_SESSION_JOURS = 30;
const COUT_BCRYPT = 12;
export const LONGUEUR_MIN_MOT_DE_PASSE = 8;

// Rôles qu'une personne peut choisir elle-même à l'inscription. Modérateur et admin sont attribués par un administrateur.
export const ROLES_INSCRIPTION: Role[] = ["acheteur", "vendeur", "agence", "agent", "notaire", "clerc"];

export type UtilisateurSession = { id: string; nom: string; email: string; role: Role };

export const normaliserEmail = (email: string) => email.trim().toLowerCase();
export const emailValide = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export const hacherMotDePasse = (motDePasse: string) => bcrypt.hash(motDePasse, COUT_BCRYPT);

// Empreinte factice : comparer contre elle quand le compte n'existe pas évite de révéler, par le temps de réponse, quelles adresses sont inscrites.
const EMPREINTE_FACTICE = bcrypt.hashSync("compte-inexistant", COUT_BCRYPT);

export async function verifierMotDePasse(motDePasse: string, empreinte: string | null | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(motDePasse, empreinte ?? EMPREINTE_FACTICE);
  return ok && !!empreinte;
}

const empreinteJeton = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export const versSession = (u: Pick<Utilisateur, "id" | "nom" | "email" | "role">): UtilisateurSession => ({ id: u.id, nom: u.nom, email: u.email, role: u.role });

export async function ouvrirSession(utilisateurId: string) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(Date.now() + DUREE_SESSION_JOURS * 86_400_000);
  await db.$transaction([
    db.session.deleteMany({ where: { utilisateurId, expireLe: { lt: new Date() } } }),
    db.session.create({ data: { jetonHash: empreinteJeton(jeton), utilisateurId, expireLe } }),
    db.utilisateur.update({ where: { id: utilisateurId }, data: { derniereConnexion: new Date() } }),
  ]);
  cookies().set(COOKIE_SESSION, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expireLe,
  });
}

export async function fermerSession() {
  const jeton = cookies().get(COOKIE_SESSION)?.value;
  if (jeton) await db.session.deleteMany({ where: { jetonHash: empreinteJeton(jeton) } });
  cookies().delete(COOKIE_SESSION);
}

// Compte de la personne connectée, ou null. Une session expirée ou un compte suspendu ne donnent accès à rien.
export async function compteCourant(): Promise<Utilisateur | null> {
  const jeton = cookies().get(COOKIE_SESSION)?.value;
  if (!jeton) return null;
  const session = await db.session.findUnique({ where: { jetonHash: empreinteJeton(jeton) }, include: { utilisateur: true } });
  if (!session || session.expireLe < new Date() || session.utilisateur.suspendu) return null;
  return session.utilisateur;
}

export async function exigerRole(...roles: Role[]): Promise<Utilisateur | null> {
  const compte = await compteCourant();
  return compte && roles.includes(compte.role) ? compte : null;
}

// Les requêtes qui modifient des données doivent venir du site lui-même, pas d'une page tierce.
export function memeOrigine(): boolean {
  const h = headers();
  const origine = h.get("origin");
  if (!origine) return true; // navigation directe ou client non navigateur : le cookie SameSite protège déjà
  try {
    return new URL(origine).host === h.get("host");
  } catch {
    return false;
  }
}

/* ── Limite de tentatives ──
   Freine les essais de mots de passe en série. Compteur en mémoire : suffisant pour un seul serveur,
   à remplacer par un compteur partagé (base ou Redis) si l'application tourne sur plusieurs instances. */
const tentatives = new Map<string, { nb: number; debut: number }>();
const FENETRE_MS = 15 * 60_000;
const MAX_TENTATIVES = 8;

export function tropDeTentatives(cle: string, max = MAX_TENTATIVES): boolean {
  const t = tentatives.get(cle);
  if (!t || Date.now() - t.debut > FENETRE_MS) return false;
  return t.nb >= max;
}

export function compterTentative(cle: string) {
  const maintenant = Date.now();
  const t = tentatives.get(cle);
  if (!t || maintenant - t.debut > FENETRE_MS) tentatives.set(cle, { nb: 1, debut: maintenant });
  else t.nb += 1;
  if (tentatives.size > 5000) for (const [k, v] of tentatives) if (maintenant - v.debut > FENETRE_MS) tentatives.delete(k);
}

export const oublierTentatives = (cle: string) => tentatives.delete(cle);

// Adresse du visiteur telle que transmise par l'hébergeur. Absente en local : on ne limite alors que par compte,
// sinon tous les visiteurs partageraient le même compteur.
export function adresseClient(): string | undefined {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || undefined;
}

// Plusieurs personnes peuvent partager une adresse (bureau, opérateur mobile) : le plafond par adresse est plus large que par compte.
export const MAX_TENTATIVES_PAR_ADRESSE = 40;

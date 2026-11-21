import "server-only";
import { db } from "./db";
import { log } from "./journal";

/* ── Limitation des essais en série ──
   Compteur gardé en base : il est partagé entre toutes les instances du serveur (Vercel en lance plusieurs),
   contrairement à un compteur en mémoire. Sert aux connexions, inscriptions, envois de fichiers, publications… */

export type Limite = { max: number; fenetreMs: number };

export const LIMITES = {
  connexionCompte: { max: 8, fenetreMs: 15 * 60_000 },
  connexionAdresse: { max: 40, fenetreMs: 15 * 60_000 },
  inscription: { max: 10, fenetreMs: 60 * 60_000 },
  fichier: { max: 60, fenetreMs: 60 * 60_000 },
  publication: { max: 20, fenetreMs: 24 * 60 * 60_000 },
  rapportNavigateur: { max: 30, fenetreMs: 10 * 60_000 },
  alerte: { max: 30, fenetreMs: 60 * 60_000 },
} satisfies Record<string, Limite>;

// Vrai si la limite est déjà atteinte (sans compter un nouvel essai).
export async function limiteAtteinte(cle: string, limite: Limite): Promise<boolean> {
  try {
    const t = await db.tentative.findUnique({ where: { cle } });
    if (!t || Date.now() - t.debut.getTime() > limite.fenetreMs) return false;
    return t.nb >= limite.max;
  } catch (e) {
    // Si le compteur est indisponible, on laisse passer plutôt que de bloquer tout le site.
    log.warn("Limitation : compteur indisponible", e);
    return false;
  }
}

export async function compterEssai(cle: string, limite: Limite) {
  try {
    const t = await db.tentative.findUnique({ where: { cle } });
    if (!t || Date.now() - t.debut.getTime() > limite.fenetreMs) {
      await db.tentative.upsert({ where: { cle }, update: { nb: 1, debut: new Date() }, create: { cle, nb: 1 } });
    } else {
      await db.tentative.update({ where: { cle }, data: { nb: { increment: 1 } } });
      if (t.nb + 1 === limite.max) log.warn("Limitation : seuil atteint", { cle: cle.replace(/:.*@/, ":***@") });
    }
    // Ménage occasionnel des compteurs expirés.
    if (Math.random() < 0.02) await db.tentative.deleteMany({ where: { debut: { lt: new Date(Date.now() - 24 * 60 * 60_000) } } });
  } catch (e) {
    log.warn("Limitation : compteur indisponible", e);
  }
}

export async function oublierEssais(cle: string) {
  await db.tentative.deleteMany({ where: { cle } }).catch(() => {});
}

// Vérifie et compte en une fois : renvoie vrai si la requête doit être refusée.
export async function freiner(cle: string, limite: Limite): Promise<boolean> {
  if (await limiteAtteinte(cle, limite)) return true;
  await compterEssai(cle, limite);
  return false;
}

/* ── Lecture du corps des requêtes ──
   Refuse les envois trop volumineux avant de les lire en entier, pour ne pas épuiser la mémoire du serveur. */
export async function lireJson(requete: Request, tailleMax = 50_000): Promise<Record<string, unknown> | null> {
  const annoncee = Number(requete.headers.get("content-length") ?? 0);
  if (annoncee > tailleMax) return null;
  const lecteur = requete.body?.getReader();
  if (!lecteur) return null;
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.length;
    if (total > tailleMax) {
      await lecteur.cancel().catch(() => {});
      log.warn("Requête refusée : contenu trop volumineux", { tailleMax });
      return null;
    }
    morceaux.push(value);
  }
  try {
    const valeur = JSON.parse(Buffer.concat(morceaux).toString("utf8"));
    return valeur && typeof valeur === "object" && !Array.isArray(valeur) ? (valeur as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Mots de passe trop courants, refusés à l'inscription même s'ils ont la bonne longueur.
const COURANTS = new Set(["12345678", "123456789", "1234567890", "password", "motdepasse", "azertyuiop", "qwertyuiop", "11111111", "00000000", "senegal123", "keurbi123", "password1", "iloveyou", "abcd1234", "admin123", "dakar2024", "dakar2025", "dakar2026"]);

export function motDePasseFaible(motDePasse: string, email: string): string | null {
  const m = motDePasse.toLowerCase();
  if (COURANTS.has(m)) return "Ce mot de passe est trop courant. Choisissez-en un plus difficile à deviner.";
  if (/^(.)\1+$/.test(m)) return "Ce mot de passe est trop simple.";
  const nom = email.split("@")[0].toLowerCase();
  if (nom.length >= 4 && m.includes(nom)) return "Le mot de passe ne doit pas contenir votre adresse email.";
  return null;
}

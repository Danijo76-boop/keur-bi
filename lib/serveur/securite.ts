import "server-only";
import { randomInt } from "crypto";
import { db } from "./db";
import { log } from "./journal";

/* ── Limitation des essais en série ──
   Compteur gardé en base : il est partagé entre toutes les instances du serveur (Vercel en lance plusieurs),
   contrairement à un compteur en mémoire. Sert aux connexions, inscriptions, envois de fichiers, publications… */

export type Limite = { max: number; fenetreMs: number };

export const LIMITES = {
  connexionCompte: { max: 8, fenetreMs: 15 * 60_000 },
  // Par adresse IP : 5 essais de connexion par minute ; au-delà, l'adresse est bloquée 15 minutes.
  connexionAdresse: { max: 5, fenetreMs: 60_000 },
  blocageConnexionAdresse: { max: 1, fenetreMs: 15 * 60_000 },
  inscription: { max: 10, fenetreMs: 60 * 60_000 },
  fichier: { max: 60, fenetreMs: 60 * 60_000 },
  publication: { max: 20, fenetreMs: 24 * 60 * 60_000 },
  rapportNavigateur: { max: 30, fenetreMs: 10 * 60_000 },
  alerte: { max: 30, fenetreMs: 60 * 60_000 },
  oubliCompte: { max: 5, fenetreMs: 60 * 60_000 },
  oubliAdresse: { max: 20, fenetreMs: 60 * 60_000 },
  assistant: { max: 40, fenetreMs: 60 * 60_000 },
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

/* ── Connexion : 5 essais par minute et par adresse IP, puis blocage temporaire ──
   Chaque essai compte, réussi ou non : un robot qui teste des mots de passe est arrêté au 6e essai de la minute,
   et l'adresse reste bloquée 15 minutes, même s'il ralentit ensuite. Renvoie les minutes restantes, ou 0 si l'essai est permis. */
export async function essaiConnexionParAdresse(ip: string | undefined): Promise<number> {
  if (!ip) return 0; // en local, pas d'adresse transmise : seule la limite par compte s'applique
  const cleBlocage = `connexion-ip-bloquee:${ip}`;
  if (await limiteAtteinte(cleBlocage, LIMITES.blocageConnexionAdresse)) return minutesAvantDeblocage(cleBlocage, LIMITES.blocageConnexionAdresse);
  const cle = `connexion-ip:${ip}`;
  if (await limiteAtteinte(cle, LIMITES.connexionAdresse)) {
    await oublierEssais(cleBlocage);
    await compterEssai(cleBlocage, LIMITES.blocageConnexionAdresse);
    log.warn("Connexion : adresse IP bloquée 15 minutes", { essaisParMinute: LIMITES.connexionAdresse.max });
    return Math.round(LIMITES.blocageConnexionAdresse.fenetreMs / 60_000);
  }
  await compterEssai(cle, LIMITES.connexionAdresse);
  return 0;
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

// Mots de passe trop courants, refusés même s'ils respectent les autres règles.
const COURANTS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "motdepasse",
  "azertyuiop",
  "qwertyuiop",
  "11111111",
  "00000000",
  "senegal123",
  "keurbi123",
  "password1",
  "iloveyou",
  "abcd1234",
  "admin123",
  "dakar2024",
  "dakar2025",
  "dakar2026",
  "password123",
  "motdepasse1",
  "azerty1234",
  "senegal2026",
  "keurbi2026",
  "bienvenue1",
  "1234abcd",
  "qwerty1234",
]);

export const LONGUEUR_MIN_MOT_DE_PASSE = 10;

/* Règles d'un nouveau mot de passe (inscription, mot de passe oublié). Les mêmes sont affichées dans le formulaire
   (lib/auth.tsx, REGLES_MOT_DE_PASSE) pour que la personne voie tout de suite ce qui manque.
   Renvoie un message clair, ou null si le mot de passe est accepté. */
export function refusMotDePasse(motDePasse: string, email: string): string | null {
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) return `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
  // bcrypt ignore tout ce qui dépasse 72 octets : on refuse plutôt que de tronquer en silence.
  if (Buffer.byteLength(motDePasse) > 72) return "Le mot de passe est trop long (72 caractères au maximum).";
  if (!/\p{L}/u.test(motDePasse)) return "Le mot de passe doit contenir au moins une lettre.";
  if (!/\d/.test(motDePasse)) return "Le mot de passe doit contenir au moins un chiffre.";
  const m = motDePasse.toLowerCase();
  if (COURANTS.has(m)) return "Ce mot de passe est trop courant : il figure parmi les premiers essayés par les pirates. Choisissez-en un plus personnel.";
  if (/^(.)\1+$/.test(m) || new Set(m).size < 4) return "Ce mot de passe est trop simple : variez davantage les caractères.";
  const nom = email.split("@")[0].toLowerCase();
  if (nom.length >= 4 && m.includes(nom)) return "Le mot de passe ne doit pas contenir votre adresse email.";
  return null;
}

// Mot de passe provisoire (compte créé par un administrateur) : respecte toujours les règles ci-dessus.
export function motDePasseProvisoire(): string {
  const lettres = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const tirer = (jeu: string, n: number) => Array.from({ length: n }, () => jeu[randomInt(jeu.length)]).join("");
  return `${tirer(lettres, 5)}-${tirer("23456789", 3)}-${tirer(lettres, 4)}`;
}

// Nombre d'essais restants avant blocage pour cette clé (pour prévenir la personne avant qu'elle soit bloquée).
export async function essaisRestants(cle: string, limite: Limite): Promise<number> {
  try {
    const t = await db.tentative.findUnique({ where: { cle } });
    if (!t || Date.now() - t.debut.getTime() > limite.fenetreMs) return limite.max;
    return Math.max(0, limite.max - t.nb);
  } catch {
    return limite.max;
  }
}

// Minutes avant la fin d'un blocage (arrondi au-dessus).
export async function minutesAvantDeblocage(cle: string, limite: Limite): Promise<number> {
  try {
    const t = await db.tentative.findUnique({ where: { cle } });
    if (!t) return 0;
    return Math.max(1, Math.ceil((t.debut.getTime() + limite.fenetreMs - Date.now()) / 60_000));
  } catch {
    return Math.ceil(limite.fenetreMs / 60_000);
  }
}

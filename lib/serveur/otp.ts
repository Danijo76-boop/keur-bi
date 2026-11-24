import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import type { Utilisateur } from "@prisma/client";
import { db } from "./db";
import { log } from "./journal";
import { freiner, type Limite } from "./securite";
import { envoyerCodeWhatsApp, masquerNumero, whatsappConfigure } from "./whatsapp";

/* ── Connexion en deux temps : mot de passe, puis code reçu par WhatsApp ──
   1. Mot de passe correct (ou compte tout juste créé) : on ouvre un « défi » au lieu d'une session.
      Le navigateur reçoit un jeton qui désigne ce défi.
   2. Si le compte a déjà un numéro WhatsApp vérifié, le code y part aussitôt ; sinon la personne saisit son numéro.
   3. Code correct : la session s'ouvre, et le numéro devient le numéro WhatsApp vérifié du compte.

   Réglage :
   - WhatsApp configuré (voir whatsapp.ts) : codes envoyés pour de bon.
   - Non configuré, en local : les codes ne partent pas, ils s'affichent à l'écran (mode démo) et dans le journal.
   - Non configuré, en ligne : la double vérification est désactivée (connexion par mot de passe seul) et une erreur
     est notée dans le journal, pour ne pas bloquer tout le monde dehors.
   - OTP_WHATSAPP=off : désactivée partout.
   Statut 410 : le défi lui-même n'existe plus, il faut recommencer la connexion depuis le mot de passe. */

const DUREE_DEFI_MS = 30 * 60_000; // temps total pour finir la connexion
const DUREE_CODE_MS = 10 * 60_000; // validité d'un code
const DELAI_RENVOI_MS = 30_000;
const ENVOIS_MAX = 5;
const ESSAIS_MAX = 5;
const LIMITE_NUMERO: Limite = { max: 6, fenetreMs: 60 * 60_000 }; // codes envoyés vers un même numéro
const LIMITE_VERIF: Limite = { max: 20, fenetreMs: 60 * 60_000 }; // codes saisis pour un même compte

export const modeDemo = () => !whatsappConfigure() && process.env.NODE_ENV !== "production";

let alerteDonnee = false;
export function otpActif(): boolean {
  if (process.env.OTP_WHATSAPP === "off") return false;
  if (whatsappConfigure() || modeDemo()) return true;
  if (!alerteDonnee) {
    alerteDonnee = true;
    log.erreur("Double vérification WhatsApp désactivée : WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID absent");
  }
  return false;
}

const empreinte = (texte: string) => createHash("sha256").update(texte).digest("hex");
const empreinteCode = (defiId: string, code: string) => empreinte(`${defiId}:${code}`);

// Réponse renvoyée au navigateur tant que la connexion n'est pas terminée.
export type EtapeOTP =
  | { etape: "numero"; defi: string }
  | { etape: "code"; defi: string; numero: string; codeDemo?: string };

export type ResultatOTP<T> = { ok: true; valeur: T } | { ok: false; erreur: string; status: number };
const echec = (erreur: string, status = 400): { ok: false; erreur: string; status: number } => ({ ok: false, erreur, status });

// Ouvre un défi pour ce compte. Le numéro peut être fourni (inscription) ; sinon on prend le numéro vérifié du compte.
export async function ouvrirDefi(compte: Utilisateur, numero?: string): Promise<ResultatOTP<EtapeOTP>> {
  const jeton = randomBytes(32).toString("base64url");
  await db.defiOTP.deleteMany({ where: { OR: [{ utilisateurId: compte.id }, { expireLe: { lt: new Date() } }] } });
  const defi = await db.defiOTP.create({
    data: { jetonHash: empreinte(jeton), utilisateurId: compte.id, expireLe: new Date(Date.now() + DUREE_DEFI_MS) },
  });
  const cible = numero ?? compte.whatsapp;
  if (!cible) return { ok: true, valeur: { etape: "numero", defi: jeton } };
  return envoyer(defi.id, jeton, cible);
}

async function lireDefi(jeton: unknown) {
  if (typeof jeton !== "string" || jeton.length > 100) return null;
  const defi = await db.defiOTP.findUnique({ where: { jetonHash: empreinte(jeton) }, include: { utilisateur: true } });
  if (!defi || defi.expireLe < new Date() || defi.utilisateur.suspendu) return null;
  return defi;
}

async function envoyer(defiId: string, jeton: string, numero: string): Promise<ResultatOTP<EtapeOTP>> {
  if (await freiner(`otp-numero:${numero}`, LIMITE_NUMERO)) return echec("Trop de codes envoyés à ce numéro. Réessayez dans une heure.", 429);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.defiOTP.update({
    where: { id: defiId },
    data: { numero, codeHash: empreinteCode(defiId, code), envoyeLe: new Date(), envois: { increment: 1 }, essais: 0 },
  });
  if (modeDemo()) {
    log.info("Code de connexion (mode démo, non envoyé)", { numero: masquerNumero(numero), code });
    return { ok: true, valeur: { etape: "code", defi: jeton, numero: masquerNumero(numero), codeDemo: code } };
  }
  const r = await envoyerCodeWhatsApp(numero, code);
  if (!r.ok) {
    // Un numéro qui n'a pas WhatsApp est refusé par Meta avec une erreur 400.
    return echec(r.raison === "http_400"
      ? "Le code n'a pas pu être envoyé. Vérifiez que ce numéro utilise bien WhatsApp."
      : "L'envoi du code par WhatsApp a échoué. Réessayez dans un instant.", 502);
  }
  return { ok: true, valeur: { etape: "code", defi: jeton, numero: masquerNumero(numero) } };
}

// Envoie (ou renvoie) le code. Un numéro saisi n'est accepté que si le compte n'a pas encore de numéro vérifié :
// connaître le mot de passe ne suffit pas pour détourner les codes vers un autre téléphone.
export async function renvoyerCode(jeton: unknown, numeroSaisi: string | null): Promise<ResultatOTP<EtapeOTP>> {
  const defi = await lireDefi(jeton);
  if (!defi) return echec("La vérification a expiré. Reconnectez-vous.", 410);
  const numero = defi.utilisateur.whatsapp ?? numeroSaisi ?? defi.numero;
  if (!numero) return echec("Indiquez votre numéro WhatsApp.");
  if (defi.envois >= ENVOIS_MAX) return echec("Trop de codes demandés. Reconnectez-vous.", 429);
  if (defi.envoyeLe && Date.now() - defi.envoyeLe.getTime() < DELAI_RENVOI_MS && numero === defi.numero) {
    return echec("Patientez quelques secondes avant de demander un nouveau code.", 429);
  }
  return envoyer(defi.id, jeton as string, numero);
}

// Vérifie le code. En cas de succès, renvoie le compte (la session est ouverte par l'appelant).
export async function verifierCode(jeton: unknown, code: unknown): Promise<ResultatOTP<Utilisateur>> {
  const defi = await lireDefi(jeton);
  if (!defi) return echec("La vérification a expiré. Reconnectez-vous.", 410);
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return echec("Le code compte 6 chiffres.");
  if (!defi.codeHash || !defi.envoyeLe || !defi.numero) return echec("Demandez d'abord un code.");
  if (Date.now() - defi.envoyeLe.getTime() > DUREE_CODE_MS) return echec("Ce code a expiré. Demandez-en un nouveau.");
  if (await freiner(`otp-verif:${defi.utilisateurId}`, LIMITE_VERIF)) return echec("Trop d'essais. Réessayez dans une heure.", 429);

  const attendu = Buffer.from(defi.codeHash, "hex");
  const recu = Buffer.from(empreinteCode(defi.id, code.trim()), "hex");
  if (!timingSafeEqual(attendu, recu)) {
    const essais = defi.essais + 1;
    if (essais >= ESSAIS_MAX) {
      await db.defiOTP.delete({ where: { id: defi.id } });
      log.warn("Code de connexion : trop d'essais, vérification annulée", { utilisateurId: defi.utilisateurId });
      return echec("Trop de codes erronés. Reconnectez-vous.", 429);
    }
    await db.defiOTP.update({ where: { id: defi.id }, data: { essais } });
    return echec(`Code incorrect. Il vous reste ${ESSAIS_MAX - essais} essai${ESSAIS_MAX - essais > 1 ? "s" : ""}.`, 401);
  }

  const [, compte] = await db.$transaction([
    db.defiOTP.delete({ where: { id: defi.id } }),
    db.utilisateur.update({
      where: { id: defi.utilisateurId },
      // Le numéro qui a reçu le code devient le numéro WhatsApp vérifié ; c'est aussi le téléphone de contact s'il n'y en avait pas.
      data: { whatsapp: defi.numero, ...(!defi.utilisateur.telephone && { telephone: defi.numero }) },
    }),
  ]);
  if (!defi.utilisateur.whatsapp) log.info("Numéro WhatsApp vérifié", { utilisateurId: compte.id });
  return { ok: true, valeur: compte };
}

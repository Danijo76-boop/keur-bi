import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import type { Utilisateur } from "@prisma/client";
import { db } from "./db";
import { echapper, envoyerEmail } from "./email";
import { log } from "./journal";
import { freiner, type Limite } from "./securite";
import { envoyerCodeSMS, smsConfigure } from "./sms";
import { envoyerCodeWhatsApp, masquerNumero, whatsappConfigure } from "./whatsapp";

/* ── Codes de vérification à usage unique ──
   Servent à deux choses :
   - « connexion » : après le mot de passe, la session ne s'ouvre qu'une fois le code saisi (double vérification) ;
   - « reinitialisation » : mot de passe oublié, le code permet d'en choisir un nouveau.

   Le code part par WhatsApp ; si WhatsApp n'aboutit pas, par SMS ; à défaut, par email. La personne peut aussi
   demander elle-même un autre moyen (« Recevoir par SMS », « Recevoir par email »).
   À la connexion, un compte sans numéro WhatsApp vérifié indique son numéro ; il devient vérifié quand le code
   est arrivé par WhatsApp ou par SMS.

   Réglage (voir whatsapp.ts, sms.ts, email.ts) :
   - au moins un moyen configuré : codes envoyés pour de bon ;
   - aucun, en local : les codes ne partent pas, ils s'affichent à l'écran (mode démo) ;
   - aucun, en ligne : la double vérification est désactivée (mot de passe seul), une erreur est notée dans le journal
     et un bandeau prévient les administrateurs ; le mot de passe oublié est indisponible ;
   - OTP_WHATSAPP=off : double vérification désactivée partout.
   Statut 410 : le défi lui-même n'existe plus, il faut recommencer depuis le début. */

const DUREE_DEFI_MS = 30 * 60_000; // temps total pour finir
const DUREE_CODE_MS = 10 * 60_000; // validité d'un code
const DELAI_RENVOI_MS = 30_000;
const ENVOIS_MAX = 5;
export const ESSAIS_MAX = 5;
const LIMITE_DESTINATION: Limite = { max: 6, fenetreMs: 60 * 60_000 }; // codes envoyés vers un même numéro ou email
const LIMITE_VERIF: Limite = { max: 20, fenetreMs: 60 * 60_000 }; // codes saisis pour un même compte

export type Canal = "whatsapp" | "sms" | "email";
export type But = "connexion" | "reinitialisation";

const emailConfigure = () => !!process.env.RESEND_API_KEY;
export const canauxConfigures = () => ({ whatsapp: whatsappConfigure(), sms: smsConfigure(), email: emailConfigure() });
const unCanal = () => whatsappConfigure() || smsConfigure() || emailConfigure();
export const modeDemo = () => !unCanal() && process.env.NODE_ENV !== "production";
const telephonePossible = () => modeDemo() || whatsappConfigure() || smsConfigure();

let alerteDonnee = false;
export function otpActif(): boolean {
  if (process.env.OTP_WHATSAPP === "off") return false;
  if (unCanal() || modeDemo()) return true;
  if (!alerteDonnee) {
    alerteDonnee = true;
    log.erreur("Double vérification désactivée : aucun moyen d'envoi des codes configuré (WhatsApp, SMS Orange/Twilio ou email Resend)");
  }
  return false;
}
// Le mot de passe oublié n'a besoin que d'un moyen d'envoi, même si la double vérification est coupée.
export const reinitialisationPossible = () => unCanal() || modeDemo();

const empreinte = (texte: string) => createHash("sha256").update(texte).digest("hex");
const empreinteCode = (defiId: string, code: string) => empreinte(`${defiId}:${code}`);
export const masquerEmail = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_, a: string, b: string, c: string) => a + "•".repeat(Math.min(b.length, 6)) + c);

// Réponse renvoyée au navigateur tant que la vérification n'est pas terminée.
// « autres » : moyens que la personne peut demander à la place (boutons « Recevoir par SMS / par email »).
export type EtapeOTP =
  { etape: "numero"; defi: string; autres: Canal[] } | { etape: "code"; defi: string; destination: string; canal: Canal; autres: Canal[]; codeDemo?: string };

export type ResultatOTP<T> = { ok: true; valeur: T } | { ok: false; erreur: string; status: number };
const echec = (erreur: string, status = 400): { ok: false; erreur: string; status: number } => ({ ok: false, erreur, status });

// Moyens utilisables pour joindre ce compte, dans l'ordre d'essai.
function canauxPossibles(numero: string | null): Canal[] {
  const demo = modeDemo();
  const c: Canal[] = [];
  if (numero && (demo || whatsappConfigure())) c.push("whatsapp");
  if (numero && (demo || smsConfigure(numero))) c.push("sms");
  if (demo || emailConfigure()) c.push("email");
  return c;
}

// Ouvre un défi. Connexion : on vise le numéro fourni (inscription) ou le numéro vérifié du compte ; sans numéro,
// la personne en indique un (ou demande l'email). Réinitialisation : uniquement le numéro déjà vérifié, sinon l'email,
// pour qu'un mot de passe oublié ne puisse pas servir à enregistrer le téléphone de quelqu'un d'autre.
export async function ouvrirDefi(compte: Utilisateur, but: But, numero?: string): Promise<ResultatOTP<EtapeOTP>> {
  const jeton = randomBytes(32).toString("base64url");
  await db.defiOTP.deleteMany({ where: { OR: [{ utilisateurId: compte.id, but }, { expireLe: { lt: new Date() } }] } });
  const cible = but === "reinitialisation" ? compte.whatsapp : (numero ?? compte.whatsapp);
  const defi = await db.defiOTP.create({
    data: { jetonHash: empreinte(jeton), utilisateurId: compte.id, but, numero: cible, expireLe: new Date(Date.now() + DUREE_DEFI_MS) },
  });
  if (!cible && but === "connexion" && telephonePossible()) {
    return { ok: true, valeur: { etape: "numero", defi: jeton, autres: canauxPossibles(null) } };
  }
  return envoyer(defi.id, jeton, compte, cible);
}

async function lireDefi(jeton: unknown, but: But) {
  if (typeof jeton !== "string" || jeton.length > 100) return null;
  const defi = await db.defiOTP.findUnique({ where: { jetonHash: empreinte(jeton) }, include: { utilisateur: true } });
  if (!defi || defi.but !== but || defi.expireLe < new Date() || defi.utilisateur.suspendu) return null;
  return defi;
}

const texteEmail = (code: string, but: But) => {
  const objet = but === "connexion" ? "votre connexion" : "la réinitialisation de votre mot de passe";
  return {
    sujet: `${code} : votre code de vérification KEUR GUI`,
    texte: `Votre code de vérification pour ${objet} est ${code}.\nIl expire dans 10 minutes.\n\nNe le communiquez à personne, même à un agent KEUR GUI.\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message et changez votre mot de passe.`,
    html: `<p>Votre code de vérification pour ${echapper(objet)} :</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Il expire dans 10 minutes.</p><p><strong>Ne le communiquez à personne</strong>, même à un agent KEUR GUI.</p><p style="color:#666">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et changez votre mot de passe.</p>`,
  };
};

async function envoyer(defiId: string, jeton: string, compte: Utilisateur, numero: string | null, canalDemande?: Canal): Promise<ResultatOTP<EtapeOTP>> {
  const possibles = canauxPossibles(numero);
  if (canalDemande && !possibles.includes(canalDemande)) return echec("Ce moyen d'envoi n'est pas disponible.");
  const ordre = canalDemande ? [canalDemande] : possibles;
  if (!ordre.length) return echec("Aucun moyen d'envoyer le code n'est disponible pour le moment. Contactez le support KEUR GUI.", 503);

  const destinationCle = ordre[0] === "email" ? compte.email : numero!;
  if (await freiner(`otp-dest:${destinationCle}`, LIMITE_DESTINATION)) return echec("Trop de codes envoyés en peu de temps. Réessayez dans une heure.", 429);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const defi = await db.defiOTP.update({
    where: { id: defiId },
    data: { codeHash: empreinteCode(defiId, code), envoyeLe: new Date(), envois: { increment: 1 }, essais: 0, canal: null },
  });
  const reussi = async (canal: Canal, codeDemo?: string): Promise<ResultatOTP<EtapeOTP>> => {
    await db.defiOTP.update({ where: { id: defiId }, data: { canal } });
    return {
      ok: true,
      valeur: {
        etape: "code",
        defi: jeton,
        canal,
        destination: canal === "email" ? masquerEmail(compte.email) : masquerNumero(numero!),
        autres: possibles.filter((c) => c !== canal),
        ...(codeDemo && { codeDemo }),
      },
    };
  };

  if (modeDemo()) {
    log.info("Code de vérification (mode démo, non envoyé)", { but: defi.but, canal: ordre[0], code });
    return reussi(ordre[0], code);
  }
  for (const canal of ordre) {
    const r =
      canal === "whatsapp"
        ? await envoyerCodeWhatsApp(numero!, code)
        : canal === "sms"
          ? await envoyerCodeSMS(numero!, code)
          : await envoyerEmail({ a: compte.email, ...texteEmail(code, defi.but as But) });
    if (r.ok) return reussi(canal);
    log.info(`Code non parti par ${canal}`, { utilisateurId: compte.id });
  }
  return echec(
    ordre.length === 1 && ordre[0] === "whatsapp"
      ? "Le code n'a pas pu être envoyé sur WhatsApp. Vérifiez que ce numéro utilise bien WhatsApp, ou choisissez un autre moyen."
      : "Le code n'a pas pu être envoyé. Vérifiez vos coordonnées et réessayez dans un instant.",
    502,
  );
}

// Envoie un nouveau code. Un numéro saisi n'est accepté qu'à la connexion d'un compte sans numéro vérifié :
// connaître le mot de passe ne suffit pas pour détourner les codes vers un autre téléphone.
export async function renvoyerCode(jeton: unknown, but: But, numeroSaisi: string | null, canalDemande?: Canal): Promise<ResultatOTP<EtapeOTP>> {
  const defi = await lireDefi(jeton, but);
  if (!defi) return echec("La vérification a expiré. Recommencez depuis le début.", 410);
  const compte = defi.utilisateur;
  const numero = compte.whatsapp ?? (but === "connexion" ? (numeroSaisi ?? defi.numero) : null);
  if (!numero && canalDemande !== "email") {
    if (!canauxPossibles(null).includes("email")) return echec("Indiquez votre numéro WhatsApp.");
    canalDemande = "email";
  }
  if (defi.envois >= ENVOIS_MAX) return echec("Trop de codes demandés. Recommencez depuis le début.", 429);
  // Le délai ne s'applique pas quand on change de moyen ou de numéro : c'est le recours quand un message n'arrive pas.
  const memeEnvoi = numero === defi.numero && (!canalDemande || canalDemande === defi.canal);
  if (defi.envoyeLe && Date.now() - defi.envoyeLe.getTime() < DELAI_RENVOI_MS && memeEnvoi) {
    return echec("Patientez quelques secondes avant de demander un nouveau code.", 429);
  }
  if (numero !== defi.numero) await db.defiOTP.update({ where: { id: defi.id }, data: { numero } });
  return envoyer(defi.id, jeton as string, compte, numero, canalDemande);
}

// Vérifie le code. En cas de succès, le défi est consommé et le compte renvoyé (l'appelant ouvre la session
// ou enregistre le nouveau mot de passe).
export async function verifierCode(jeton: unknown, but: But, code: unknown): Promise<ResultatOTP<Utilisateur>> {
  const defi = await lireDefi(jeton, but);
  if (!defi) return echec("La vérification a expiré. Recommencez depuis le début.", 410);
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return echec("Le code compte 6 chiffres.");
  if (!defi.codeHash || !defi.envoyeLe || !defi.canal) return echec("Demandez d'abord un code.");
  if (Date.now() - defi.envoyeLe.getTime() > DUREE_CODE_MS) return echec("Ce code a expiré (10 minutes). Demandez-en un nouveau.");
  if (await freiner(`otp-verif:${defi.utilisateurId}`, LIMITE_VERIF)) return echec("Trop d'essais. Réessayez dans une heure.", 429);

  const attendu = Buffer.from(defi.codeHash, "hex");
  const recu = Buffer.from(empreinteCode(defi.id, code.trim()), "hex");
  if (!timingSafeEqual(attendu, recu)) {
    const essais = defi.essais + 1;
    if (essais >= ESSAIS_MAX) {
      await db.defiOTP.delete({ where: { id: defi.id } });
      log.warn("Code de vérification : trop d'essais, vérification annulée", { utilisateurId: defi.utilisateurId, but });
      return echec("Trop de codes erronés : par sécurité, la vérification est annulée. Recommencez depuis le début.", 429);
    }
    await db.defiOTP.update({ where: { id: defi.id }, data: { essais } });
    const reste = ESSAIS_MAX - essais;
    return echec(`Code incorrect. Il vous reste ${reste} essai${reste > 1 ? "s" : ""} avant l'annulation de la vérification.`, 401);
  }

  // Le numéro devient vérifié seulement si le code y est arrivé (WhatsApp ou SMS), pas s'il est arrivé par email.
  const numeroVerifie = defi.numero && (defi.canal === "whatsapp" || defi.canal === "sms") && defi.numero !== defi.utilisateur.whatsapp ? defi.numero : null;
  const [, compte] = await db.$transaction([
    db.defiOTP.delete({ where: { id: defi.id } }),
    db.utilisateur.update({
      where: { id: defi.utilisateurId },
      data: numeroVerifie ? { whatsapp: numeroVerifie, ...(!defi.utilisateur.telephone && { telephone: numeroVerifie }) } : {},
    }),
  ]);
  if (numeroVerifie) log.info("Numéro WhatsApp vérifié", { utilisateurId: compte.id });
  return { ok: true, valeur: compte };
}

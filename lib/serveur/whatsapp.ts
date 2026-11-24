import "server-only";
import { log } from "./journal";

/* ── Envoi des codes de connexion par WhatsApp ──
   Passe par l'API officielle de Meta (WhatsApp Cloud API). À configurer :
   - WHATSAPP_TOKEN : jeton d'accès permanent (utilisateur système de Meta Business) ;
   - WHATSAPP_PHONE_NUMBER_ID : identifiant du numéro expéditeur (WhatsApp Manager → Numéros de téléphone) ;
   - WHATSAPP_MODELE (facultatif, défaut « code_connexion ») : nom du modèle de message de catégorie « Authentification »,
     approuvé par Meta, avec le bouton « Copier le code » ;
   - WHATSAPP_LANGUE (facultatif, défaut « fr ») : langue des modèles ;
   - WHATSAPP_MODELE_ALERTE (facultatif) : modèle « Utilité » pour les alertes de connexion (voir envoyerAlerteWhatsApp).
   Sans WHATSAPP_TOKEN ni WHATSAPP_PHONE_NUMBER_ID, rien n'est envoyé (voir otpActif dans otp.ts). */

const VERSION_API = process.env.WHATSAPP_API_VERSION || "v21.0";

export const whatsappConfigure = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

// Met un numéro au format international (+221771234567). Les numéros sénégalais peuvent être saisis sans indicatif.
// Renvoie null si le numéro n'est pas valable.
export function normaliserNumero(saisie: string): string | null {
  let n = saisie.replace(/[\s.\-()/]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (/^[37]\d{8}$/.test(n)) n = "+221" + n; // mobile ou fixe sénégalais sans indicatif
  if (/^221\d{9}$/.test(n)) n = "+" + n;
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}

// « +221 77 *** ** 67 » : assez pour que la personne reconnaisse son numéro, pas assez pour le révéler.
export const masquerNumero = (n: string) => `${n.slice(0, n.length - 9)} ${n.slice(-9, -7)} *** ** ${n.slice(-2)}`;

export type ResultatEnvoi = { ok: true } | { ok: false; raison: string };

// Envoie un modèle de message approuvé par Meta (seuls les modèles peuvent être envoyés sans que la personne ait écrit avant).
async function envoyerModele(numero: string, modele: string, components: unknown[], objet: string): Promise<ResultatEnvoi> {
  if (!whatsappConfigure()) return { ok: false, raison: "non_configure" };
  try {
    const r = await fetch(`https://graph.facebook.com/${VERSION_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numero.replace("+", ""),
        type: "template",
        template: { name: modele, language: { code: process.env.WHATSAPP_LANGUE || "fr" }, components },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      log.warn(`WhatsApp : ${objet} refusé par Meta`, { statut: r.status, reponse: (await r.text()).slice(0, 400), numero: masquerNumero(numero) });
      return { ok: false, raison: `http_${r.status}` };
    }
    log.info(`WhatsApp : ${objet} envoyé`, { numero: masquerNumero(numero) });
    return { ok: true };
  } catch (e) {
    log.warn("WhatsApp : service injoignable", e);
    return { ok: false, raison: "injoignable" };
  }
}

export function envoyerCodeWhatsApp(numero: string, code: string): Promise<ResultatEnvoi> {
  return envoyerModele(numero, process.env.WHATSAPP_MODELE || "code_connexion", [
    { type: "body", parameters: [{ type: "text", text: code }] },
    // Bouton « Copier le code » des modèles d'authentification.
    { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
  ], "code");
}

// Alerte de sécurité (nouvelle connexion, mot de passe changé). Nécessite un second modèle, de catégorie « Utilité »,
// nommé par WHATSAPP_MODELE_ALERTE, avec deux variables : {{1}} l'évènement, {{2}} la date et l'appareil.
export const alerteWhatsAppConfiguree = () => whatsappConfigure() && !!process.env.WHATSAPP_MODELE_ALERTE;

export function envoyerAlerteWhatsApp(numero: string, evenement: string, details: string): Promise<ResultatEnvoi> {
  return envoyerModele(numero, process.env.WHATSAPP_MODELE_ALERTE!, [
    { type: "body", parameters: [{ type: "text", text: evenement }, { type: "text", text: details }] },
  ], "alerte de sécurité");
}

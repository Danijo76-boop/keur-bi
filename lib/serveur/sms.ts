import "server-only";
import { log } from "./journal";
import { masquerNumero } from "./whatsapp";

/* ── Envoi des codes de connexion par SMS (secours quand WhatsApp n'aboutit pas) ──
   Deux fournisseurs, activés chacun par ses variables :
   - Orange SMS API (developer.orange.com) : ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET,
     ORANGE_SMS_EXPEDITEUR (facultatif, défaut « tel:+2210000 »), ORANGE_SMS_NOM (facultatif, nom d'expéditeur validé par Orange).
     Utilisé pour les numéros sénégalais (+221).
   - Twilio (twilio.com) : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, et TWILIO_FROM (numéro ou nom d'expéditeur)
     ou TWILIO_MESSAGING_SERVICE_SID. Utilisé pour les autres numéros, et pour tous si Orange n'est pas configuré. */

const orangeConfigure = () => !!(process.env.ORANGE_CLIENT_ID && process.env.ORANGE_CLIENT_SECRET);
const twilioConfigure = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID));

// Vrai si un SMS peut partir vers ce numéro (ou vers au moins un numéro, sans argument).
export function smsConfigure(numero?: string): boolean {
  if (twilioConfigure()) return true;
  return orangeConfigure() && (!numero || numero.startsWith("+221"));
}

const texteSMS = (code: string) =>
  `KEUR GUI : votre code de vérification est ${code}. Il expire dans 10 minutes. Ne le communiquez à personne, même à un agent KEUR GUI.`;

export type ResultatSMS = { ok: true } | { ok: false; raison: string };

export const envoyerCodeSMS = (numero: string, code: string) => envoyerSMS(numero, texteSMS(code), "code");

// Message libre (alerte de sécurité). Le SMS, contrairement à WhatsApp, n'exige pas de modèle approuvé.
export async function envoyerSMS(numero: string, texte: string, objet = "message"): Promise<ResultatSMS> {
  const viaOrange = orangeConfigure() && numero.startsWith("+221");
  if (!viaOrange && !twilioConfigure()) return { ok: false, raison: "non_configure" };
  try {
    const r = viaOrange ? await viaOrangeSMS(numero, texte) : await viaTwilio(numero, texte);
    if (!r.ok) {
      log.warn(`SMS : ${objet} refusé par ${viaOrange ? "Orange" : "Twilio"}`, {
        statut: r.status,
        reponse: (await r.text()).slice(0, 400),
        numero: masquerNumero(numero),
      });
      return { ok: false, raison: `http_${r.status}` };
    }
    log.info(`SMS : ${objet} envoyé`, { fournisseur: viaOrange ? "orange" : "twilio", numero: masquerNumero(numero) });
    return { ok: true };
  } catch (e) {
    log.warn("SMS : service injoignable", e);
    return { ok: false, raison: "injoignable" };
  }
}

// ── Orange : jeton d'accès (valable une heure, gardé en mémoire) puis envoi ──
let jetonOrange: { valeur: string; expire: number } | null = null;

async function lireJetonOrange(): Promise<string> {
  if (jetonOrange && jetonOrange.expire > Date.now() + 60_000) return jetonOrange.valeur;
  const identifiants = Buffer.from(`${process.env.ORANGE_CLIENT_ID}:${process.env.ORANGE_CLIENT_SECRET}`).toString("base64");
  const r = await fetch("https://api.orange.com/oauth/v3/token", {
    method: "POST",
    headers: { Authorization: `Basic ${identifiants}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`Orange : jeton refusé (${r.status}) ${(await r.text()).slice(0, 200)}`);
  const d = (await r.json()) as { access_token: string; expires_in: number };
  jetonOrange = { valeur: d.access_token, expire: Date.now() + d.expires_in * 1000 };
  return d.access_token;
}

async function viaOrangeSMS(numero: string, texte: string): Promise<Response> {
  const expediteur = process.env.ORANGE_SMS_EXPEDITEUR || "tel:+2210000";
  return fetch(`https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(expediteur)}/requests`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await lireJetonOrange()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      outboundSMSMessageRequest: {
        address: `tel:${numero}`,
        senderAddress: expediteur,
        ...(process.env.ORANGE_SMS_NOM && { senderName: process.env.ORANGE_SMS_NOM }),
        outboundSMSTextMessage: { message: texte },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
}

async function viaTwilio(numero: string, texte: string): Promise<Response> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const corps = new URLSearchParams({ To: numero, Body: texte });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) corps.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else corps.set("From", process.env.TWILIO_FROM!);
  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}` },
    body: corps,
    signal: AbortSignal.timeout(10_000),
  });
}

import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import type { Utilisateur } from "@prisma/client";
import { adresseSite, echapper, envoyerEmail } from "./email";
import { log } from "./journal";
import { envoyerSMS, smsConfigure } from "./sms";
import { alerteWhatsAppConfiguree, envoyerAlerteWhatsApp } from "./whatsapp";

/* ── Alertes de sécurité ──
   À chaque connexion réussie et à chaque changement de mot de passe, la personne est prévenue :
   par WhatsApp (modèle WHATSAPP_MODELE_ALERTE), sinon par SMS, sur son numéro vérifié ; et par email si Resend
   est configuré. Si ce n'est pas elle, le message lui dit quoi faire.
   L'envoi a lieu après la réponse (after) : il ne ralentit pas la connexion, et un échec ne la bloque pas. */

export type Evenement = "connexion" | "mot_de_passe";

const LIBELLES: Record<Evenement, string> = {
  connexion: "Nouvelle connexion à votre compte",
  mot_de_passe: "Votre mot de passe a été changé",
};

// « Chrome sur Android » : assez pour reconnaître son appareil, sans conserver l'empreinte complète du navigateur.
export function decrireAppareil(ua: string): string {
  const navigateur = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "un navigateur";
  const systeme = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "un appareil inconnu";
  return `${navigateur} sur ${systeme}`;
}

export async function alerterSecurite(compte: Utilisateur, evenement: Evenement) {
  const h = await headers();
  const appareil = decrireAppareil(h.get("user-agent") ?? "");
  const ville = h.get("x-vercel-ip-city");
  const quand = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Dakar", dateStyle: "short", timeStyle: "short" });
  const details = `le ${quand} (heure de Dakar), ${appareil}${ville ? `, ${decodeURIComponent(ville)}` : ""}`;
  const lien = `${adresseSite()}/mot-de-passe-oublie`;
  const consigne = `Si ce n'est pas vous, changez immédiatement votre mot de passe : ${lien}`;

  after(async () => {
    try {
      const numero = compte.whatsapp;
      let parTelephone = false;
      if (numero && alerteWhatsAppConfiguree()) parTelephone = (await envoyerAlerteWhatsApp(numero, LIBELLES[evenement], details)).ok;
      if (numero && !parTelephone && smsConfigure(numero)) {
        parTelephone = (await envoyerSMS(numero, `KEUR BI : ${LIBELLES[evenement]} ${details}. ${consigne}`, "alerte de sécurité")).ok;
      }
      if (process.env.RESEND_API_KEY) {
        await envoyerEmail({
          a: compte.email,
          sujet: `KEUR BI : ${LIBELLES[evenement].toLowerCase()}`,
          texte: `Bonjour ${compte.nom},\n\n${LIBELLES[evenement]} ${details}.\n\nSi c'est vous, il n'y a rien à faire.\n${consigne}\n\nL'équipe KEUR BI`,
          html: `<p>Bonjour ${echapper(compte.nom)},</p><p><strong>${echapper(LIBELLES[evenement])}</strong> ${echapper(details)}.</p><p>Si c'est vous, il n'y a rien à faire.</p><p>Si ce n'est pas vous, <a href="${lien}">changez immédiatement votre mot de passe</a>.</p><p>L'équipe KEUR BI</p>`,
        });
      }
    } catch (e) {
      log.warn("Alerte de sécurité non envoyée", e);
    }
  });
}

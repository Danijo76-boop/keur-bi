import "server-only";
import { log } from "./journal";

/* ── Envoi d'emails ──
   Passe par Resend (https://resend.com) si la variable RESEND_API_KEY est définie.
   Sans elle, l'email n'est pas envoyé : il est seulement noté dans le journal, ce qui permet de tester en local.
   EMAIL_EXPEDITEUR doit être une adresse d'un domaine vérifié chez Resend (ex. « KEUR BI <alertes@keurbi.sn> »). */

export type Email = { a: string; sujet: string; html: string; texte: string };
export type ResultatEmail = { ok: true } | { ok: false; raison: string };

export const adresseSite = () => (process.env.APP_URL || "https://keur-bi.vercel.app").replace(/\/$/, "");

export function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export async function envoyerEmail(e: Email): Promise<ResultatEmail> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    log.info("Email non envoyé : aucun service d'envoi configuré (RESEND_API_KEY)", { email: e.a, sujet: e.sujet });
    return { ok: false, raison: "non_configure" };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_EXPEDITEUR || "KEUR BI <onboarding@resend.dev>",
        to: [e.a],
        subject: e.sujet,
        html: e.html,
        text: e.texte,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      log.warn("Email refusé par le service d'envoi", { statut: r.status, reponse: (await r.text()).slice(0, 300), email: e.a });
      return { ok: false, raison: `http_${r.status}` };
    }
    log.info("Email envoyé", { email: e.a, sujet: e.sujet });
    return { ok: true };
  } catch (err) {
    log.warn("Email : service d'envoi injoignable", err);
    return { ok: false, raison: "injoignable" };
  }
}

"use client";

/* ── Erreurs survenues dans le navigateur ──
   Elles sont envoyées au serveur, qui les écrit dans le journal technique avec un code court.
   Ce code est montré à la personne : en le communiquant, elle permet de retrouver l'erreur exacte. */

let envoyees = 0;
const MAX_PAR_PAGE = 5;

export function codeErreur(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function signalerErreur(erreur: unknown, type = "erreur", code = codeErreur()): string {
  if (typeof window === "undefined" || envoyees >= MAX_PAR_PAGE) return code;
  envoyees += 1;
  const e = erreur instanceof Error ? erreur : new Error(String(erreur));
  const rapport = { code, type, message: e.message, pile: e.stack, page: window.location.pathname };
  try {
    fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rapport), keepalive: true }).catch(() => {});
  } catch {
    /* le signalement ne doit jamais provoquer une nouvelle erreur */
  }
  if (process.env.NODE_ENV !== "production") console.error(`[KEUR GUI] Erreur ${code}`, e);
  return code;
}

// Message à afficher quand le serveur a échoué : inclut sa référence de requête pour le support.
export function avecReference(message: string, reponse: Response): string {
  const ref = reponse.headers.get("x-request-id");
  return reponse.status >= 500 && ref ? `${message} (référence ${ref.slice(0, 8)})` : message;
}

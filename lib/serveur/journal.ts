import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "./db";

/* ── Journal technique ──
   Chaque ligne est un objet JSON sur la sortie standard : lisible dans le terminal en local,
   et dans Vercel → projet → Logs en ligne.
   Niveau réglable par la variable LOG_LEVEL (debug, info, warn, erreur) : debug par défaut en local, info en ligne.
   Les avertissements, les erreurs et les actions d'administration sont aussi gardés en base (table JournalTechnique),
   car Vercel n'en conserve qu'une heure dans l'offre gratuite. Ils sont consultables dans Administration → Journal technique. */

export type Niveau = "debug" | "info" | "warn" | "erreur";
const ORDRE: Record<Niveau, number> = { debug: 10, info: 20, warn: 30, erreur: 40 };
const seuil = ORDRE[process.env.LOG_LEVEL as Niveau] ?? (process.env.NODE_ENV === "production" ? ORDRE.info : ORDRE.debug);

// Contexte de la requête en cours, transmis automatiquement à chaque ligne de journal.
type Contexte = { requeteId: string; route: string; utilisateurId?: string };
const contexte = new AsyncLocalStorage<Contexte>();

export const requeteCourante = () => contexte.getStore();
export function noterUtilisateur(id: string) {
  const c = contexte.getStore();
  if (c) c.utilisateurId = id;
}

// Rien de secret ne doit finir dans les journaux : mots de passe, jetons, cookies, images envoyées.
const CLES_SECRETES = /mot.?de.?passe|password|hash|jeton|token|cookie|secret|authorization|dataurl|donnees/i;

function nettoyer(valeur: unknown, profondeur = 0): unknown {
  if (valeur instanceof Error)
    return {
      nom: valeur.name,
      message: valeur.message,
      pile: valeur.stack?.split("\n").slice(0, 8).join("\n"),
      ...("code" in valeur ? { code: (valeur as { code: unknown }).code } : {}),
    };
  if (typeof valeur === "bigint") return valeur.toString();
  if (typeof valeur === "string") return valeur.length > 2000 ? valeur.slice(0, 2000) + "…" : valeur;
  if (!valeur || typeof valeur !== "object") return valeur;
  if (profondeur > 4) return "[…]";
  if (Array.isArray(valeur)) return valeur.slice(0, 20).map((v) => nettoyer(v, profondeur + 1));
  return Object.fromEntries(
    Object.entries(valeur as Record<string, unknown>).map(([k, v]) => [
      k,
      CLES_SECRETES.test(k) ? "[masqué]" : k === "email" && typeof v === "string" ? v.replace(/^(.).*(@.*)$/, "$1***$2") : nettoyer(v, profondeur + 1),
    ]),
  );
}

async function conserver(niveau: Niveau, message: string, details: unknown, categorie?: string) {
  try {
    const c = contexte.getStore();
    await db.journalTechnique.create({
      data: {
        niveau,
        categorie: categorie ?? null,
        message: message.slice(0, 500),
        details: (details ?? undefined) as object | undefined,
        requeteId: c?.requeteId ?? null,
        route: c?.route ?? null,
        utilisateurId: c?.utilisateurId ?? null,
      },
    });
  } catch (e) {
    // Jamais de boucle : si la base est en panne, on l'écrit seulement à l'écran.
    console.error(
      JSON.stringify({ date: new Date().toISOString(), niveau: "erreur", message: "Journal technique : écriture en base impossible", erreur: String(e) }),
    );
  }
}

function ecrire(niveau: Niveau, message: string, details?: unknown, categorie?: string) {
  const garder = niveau === "warn" || niveau === "erreur" || categorie === "audit";
  if (ORDRE[niveau] < seuil && !garder) return;
  const propre = details === undefined ? undefined : nettoyer(details);
  const c = contexte.getStore();
  const ligne = {
    date: new Date().toISOString(),
    niveau,
    message,
    ...(categorie && { categorie }),
    ...(c && { requete: c.requeteId, route: c.route, utilisateur: c.utilisateurId }),
    ...(propre !== undefined && { details: propre }),
  };
  if (ORDRE[niveau] >= seuil || garder) (niveau === "erreur" ? console.error : niveau === "warn" ? console.warn : console.log)(JSON.stringify(ligne));
  if (garder) void conserver(niveau, message, propre, categorie);
}

export const log = {
  debug: (message: string, details?: unknown) => ecrire("debug", message, details),
  info: (message: string, details?: unknown) => ecrire("info", message, details),
  warn: (message: string, details?: unknown) => ecrire("warn", message, details),
  erreur: (message: string, details?: unknown) => ecrire("erreur", message, details),
  // Actions sensibles (droits, suspensions, décisions) : toujours conservées, quel que soit le niveau.
  audit: (message: string, details?: unknown) => ecrire("info", message, details, "audit"),
};

/* ── Enveloppe des routes serveur ──
   Donne à chaque requête un identifiant, mesure sa durée, journalise son résultat,
   rattrape toute erreur imprévue et renvoie l'identifiant au navigateur (en-tête x-request-id)
   pour qu'un bug signalé puisse être retrouvé dans le journal. */
export function avecJournal<C>(nom: string, gestionnaire: (requete: Request, ctx: C) => Promise<Response>) {
  return async (requete: Request, ctx: C): Promise<Response> => {
    const requeteId = requete.headers.get("x-request-id") || randomUUID();
    const debut = Date.now();
    return contexte.run({ requeteId, route: nom }, async () => {
      log.debug("Requête reçue", { methode: requete.method, url: new URL(requete.url).pathname + new URL(requete.url).search });
      let reponse: Response;
      try {
        reponse = await gestionnaire(requete, ctx);
      } catch (e) {
        log.erreur("Erreur non gérée", e);
        reponse = NextResponse.json({ erreur: "Une erreur inattendue est survenue.", reference: requeteId.slice(0, 8) }, { status: 500 });
      }
      const duree = Date.now() - debut;
      const statut = reponse.status;
      const resume = { methode: requete.method, statut, dureeMs: duree };
      if (statut >= 500) log.warn("Requête en échec", resume);
      else if (duree > 3000) log.warn("Requête lente", resume);
      else log.info("Requête traitée", resume);
      try {
        reponse.headers.set("x-request-id", requeteId);
        if (!reponse.headers.has("Cache-Control")) reponse.headers.set("Cache-Control", "no-store");
      } catch {
        /* en-têtes figés : sans conséquence */
      }
      return reponse;
    });
  };
}

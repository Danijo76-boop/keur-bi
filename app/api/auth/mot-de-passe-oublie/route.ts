import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import { adresseClient, emailValide, memeOrigine, normaliserEmail } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { ouvrirDefi, reinitialisationPossible } from "@/lib/serveur/otp";
import { freiner, LIMITES, lireJson } from "@/lib/serveur/securite";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/mot-de-passe-oublie  { email } : envoie un code pour choisir un nouveau mot de passe.
// La réponse est la même que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
// Le code part sur le numéro WhatsApp déjà vérifié du compte (WhatsApp, sinon SMS), à défaut par email.
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const corps = await lireJson(requete);
  const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
  if (!emailValide(email)) return refus("Indiquez l'adresse email de votre compte.");
  if (!reinitialisationPossible()) {
    log.erreur("Mot de passe oublié indisponible : aucun moyen d'envoi des codes configuré");
    return refus("La réinitialisation du mot de passe n'est pas encore disponible. Contactez le support KEUR BI.", 503);
  }
  const ip = await adresseClient();
  if ((ip && (await freiner(`oubli-ip:${ip}`, LIMITES.oubliAdresse))) || (await freiner(`oubli:${email}`, LIMITES.oubliCompte))) {
    return refus("Trop de demandes en peu de temps. Réessayez dans une heure.", 429);
  }

  try {
    const compte = await db.utilisateur.findUnique({ where: { email } });
    let defi = randomBytes(32).toString("base64url"); // jeton factice si le compte n'existe pas
    let codeDemo: string | undefined;
    if (compte && !compte.suspendu) {
      const r = await ouvrirDefi(compte, "reinitialisation");
      if (r.ok) {
        defi = r.valeur.defi;
        if (r.valeur.etape === "code") codeDemo = r.valeur.codeDemo;
        log.info("Mot de passe oublié : code envoyé", { utilisateurId: compte.id, canal: r.valeur.etape === "code" ? r.valeur.canal : null });
      } else {
        log.warn("Mot de passe oublié : code non envoyé", { utilisateurId: compte.id, raison: r.erreur });
      }
    } else {
      log.info("Mot de passe oublié : adresse inconnue ou compte suspendu", { email });
    }
    return NextResponse.json({ defi, ...(codeDemo && { codeDemo }) });
  } catch (e) {
    log.erreur("POST /api/auth/mot-de-passe-oublie", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/auth/mot-de-passe-oublie", post);

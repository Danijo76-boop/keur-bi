import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import {
  adresseClient, memeOrigine, normaliserEmail, ouvrirSession, verifierMotDePasse, versSession,
} from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { compterEssai, LIMITES, limiteAtteinte, lireJson, oublierEssais } from "@/lib/serveur/securite";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/connexion  { email, motDePasse }
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const corps = await lireJson(requete);
  const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
  const motDePasse = typeof corps?.motDePasse === "string" ? corps.motDePasse : "";
  if (!email || !motDePasse) return refus("Email et mot de passe requis.");

  const ip = (await adresseClient());
  const cleCompte = `connexion:${email}`;
  const cleAdresse = ip && `connexion-ip:${ip}`;
  if ((await limiteAtteinte(cleCompte, LIMITES.connexionCompte)) || (cleAdresse && (await limiteAtteinte(cleAdresse, LIMITES.connexionAdresse)))) {
    log.warn("Connexion bloquée : trop d'essais", { email });
    return refus("Trop de tentatives. Réessayez dans quelques minutes.", 429);
  }

  try {
    const compte = await db.utilisateur.findUnique({ where: { email } });
    // Même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
    if (!(await verifierMotDePasse(motDePasse, compte?.motDePasseHash)) || !compte) {
      await compterEssai(cleCompte, LIMITES.connexionCompte);
      if (cleAdresse) await compterEssai(cleAdresse, LIMITES.connexionAdresse);
      log.info("Connexion refusée : identifiants incorrects", { email });
      return refus("Email ou mot de passe incorrect.", 401);
    }
    if (compte.suspendu) {
      log.info("Connexion refusée : compte suspendu", { utilisateurId: compte.id });
      return refus("Ce compte est suspendu. Contactez le support KEUR BI.", 403);
    }
    await oublierEssais(cleCompte);
    log.info("Connexion réussie", { utilisateurId: compte.id, role: compte.role });
    await ouvrirSession(compte.id);
    return NextResponse.json({ utilisateur: versSession(compte) });
  } catch (e) {
    log.erreur("POST /api/auth/connexion", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/auth/connexion", post);

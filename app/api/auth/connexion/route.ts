import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import { adresseClient, memeOrigine, normaliserEmail, ouvrirSession, verifierMotDePasse, versSession } from "@/lib/serveur/auth";
import { alerterSecurite } from "@/lib/serveur/alertes-securite";
import { avecJournal, log } from "@/lib/serveur/journal";
import { otpActif, ouvrirDefi } from "@/lib/serveur/otp";
import { compterEssai, essaisRestants, LIMITES, limiteAtteinte, lireJson, minutesAvantDeblocage, oublierEssais } from "@/lib/serveur/securite";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/connexion  { email, motDePasse }
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const corps = await lireJson(requete);
  const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
  const motDePasse = typeof corps?.motDePasse === "string" ? corps.motDePasse : "";
  if (!email || !motDePasse) return refus("Indiquez votre adresse email et votre mot de passe.");

  const ip = await adresseClient();
  const cleCompte = `connexion:${email}`;
  const cleAdresse = ip && `connexion-ip:${ip}`;
  if (await limiteAtteinte(cleCompte, LIMITES.connexionCompte)) {
    const minutes = await minutesAvantDeblocage(cleCompte, LIMITES.connexionCompte);
    log.warn("Connexion bloquée : trop d'essais sur le compte", { email });
    return refus(
      `Trop de mots de passe erronés pour ce compte : par sécurité, la connexion est bloquée pendant encore ${minutes} minute${minutes > 1 ? "s" : ""}. Si vous avez oublié votre mot de passe, utilisez « Mot de passe oublié ».`,
      429,
    );
  }
  if (cleAdresse && (await limiteAtteinte(cleAdresse, LIMITES.connexionAdresse))) {
    log.warn("Connexion bloquée : trop d'essais depuis cette adresse", { email });
    return refus("Trop de tentatives de connexion depuis votre réseau. Réessayez dans quelques minutes.", 429);
  }

  try {
    const compte = await db.utilisateur.findUnique({ where: { email } });
    // Même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
    if (!(await verifierMotDePasse(motDePasse, compte?.motDePasseHash)) || !compte) {
      await compterEssai(cleCompte, LIMITES.connexionCompte);
      if (cleAdresse) await compterEssai(cleAdresse, LIMITES.connexionAdresse);
      log.info("Connexion refusée : identifiants incorrects", { email });
      const reste = await essaisRestants(cleCompte, LIMITES.connexionCompte);
      const minutes = Math.round(LIMITES.connexionCompte.fenetreMs / 60_000);
      if (reste === 0) return refus(`Email ou mot de passe incorrect. Par sécurité, la connexion à ce compte est maintenant bloquée ${minutes} minutes.`, 401);
      if (reste <= 3)
        return refus(
          `Email ou mot de passe incorrect. Attention : encore ${reste} essai${reste > 1 ? "s" : ""}, puis la connexion sera bloquée ${minutes} minutes.`,
          401,
        );
      return refus("Email ou mot de passe incorrect.", 401);
    }
    if (compte.suspendu) {
      log.info("Connexion refusée : compte suspendu", { utilisateurId: compte.id });
      return refus("Ce compte est suspendu. Contactez le support KEUR BI.", 403);
    }
    await oublierEssais(cleCompte);
    // Double vérification : le mot de passe ne suffit pas, un code est envoyé par WhatsApp, SMS ou email.
    if (otpActif()) {
      const defi = await ouvrirDefi(compte, "connexion");
      if (!defi.ok) return refus(defi.erreur, defi.status);
      log.info("Mot de passe correct, code de vérification demandé", { utilisateurId: compte.id, etape: defi.valeur.etape });
      return NextResponse.json({ otp: defi.valeur });
    }
    log.info("Connexion réussie", { utilisateurId: compte.id, role: compte.role });
    await ouvrirSession(compte.id);
    await alerterSecurite(compte, "connexion");
    return NextResponse.json({ utilisateur: versSession(compte) });
  } catch (e) {
    log.erreur("POST /api/auth/connexion", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/auth/connexion", post);

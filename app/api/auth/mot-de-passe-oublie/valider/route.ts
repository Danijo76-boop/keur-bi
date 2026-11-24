import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import { hacherMotDePasse, memeOrigine, normaliserEmail, ouvrirSession, versSession } from "@/lib/serveur/auth";
import { alerterSecurite } from "@/lib/serveur/alertes-securite";
import { avecJournal, log } from "@/lib/serveur/journal";
import { verifierCode } from "@/lib/serveur/otp";
import { lireJson, oublierEssais, refusMotDePasse } from "@/lib/serveur/securite";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/mot-de-passe-oublie/valider  { email, defi, code, motDePasse }
// Code correct : le nouveau mot de passe est enregistré, toutes les sessions ouvertes sont fermées
// (un éventuel intrus est déconnecté), puis une nouvelle session s'ouvre pour la personne.
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const corps = await lireJson(requete);
  const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
  const motDePasse = typeof corps?.motDePasse === "string" ? corps.motDePasse : "";
  // Le mot de passe est vérifié avant le code, pour ne pas consommer un essai de code pour rien.
  const faiblesse = refusMotDePasse(motDePasse, email);
  if (faiblesse) return refus(faiblesse);
  if (typeof corps?.code !== "string" || !/^\d{6}$/.test(corps.code.trim())) return refus("Le code compte 6 chiffres.");

  try {
    const r = await verifierCode(corps?.defi, "reinitialisation", corps.code);
    if (!r.ok) {
      // Message volontairement unique, que le compte existe ou non : il ne doit rien révéler.
      return refus("Code incorrect ou expiré. Vérifiez le dernier code reçu, ou demandez-en un nouveau. Après 5 erreurs, un nouveau code est nécessaire.", 401);
    }
    const compte = r.valeur;
    await db.$transaction([
      db.utilisateur.update({ where: { id: compte.id }, data: { motDePasseHash: await hacherMotDePasse(motDePasse) } }),
      db.session.deleteMany({ where: { utilisateurId: compte.id } }),
    ]);
    await oublierEssais(`connexion:${compte.email}`);
    await ouvrirSession(compte.id);
    await alerterSecurite(compte, "mot_de_passe");
    log.audit("Mot de passe réinitialisé", { utilisateurId: compte.id });
    return NextResponse.json({ utilisateur: versSession(compte) });
  } catch (e) {
    log.erreur("POST /api/auth/mot-de-passe-oublie/valider", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/auth/mot-de-passe-oublie/valider", post);

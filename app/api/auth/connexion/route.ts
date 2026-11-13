import { NextResponse } from "next/server";
import { db } from "@/lib/serveur/db";
import {
  adresseClient, compterTentative, MAX_TENTATIVES_PAR_ADRESSE, memeOrigine, normaliserEmail, oublierTentatives, ouvrirSession,
  tropDeTentatives, verifierMotDePasse, versSession,
} from "@/lib/serveur/auth";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/connexion  { email, motDePasse }
export async function POST(requete: Request) {
  if (!memeOrigine()) return refus("Requête refusée.", 403);
  const corps = await requete.json().catch(() => null);
  const email = typeof corps?.email === "string" ? normaliserEmail(corps.email) : "";
  const motDePasse = typeof corps?.motDePasse === "string" ? corps.motDePasse : "";
  if (!email || !motDePasse) return refus("Email et mot de passe requis.");

  const ip = adresseClient();
  const cleCompte = `connexion:${email}`;
  const cleAdresse = ip && `connexion-ip:${ip}`;
  if (tropDeTentatives(cleCompte) || (cleAdresse && tropDeTentatives(cleAdresse, MAX_TENTATIVES_PAR_ADRESSE))) return refus("Trop de tentatives. Réessayez dans quelques minutes.", 429);

  try {
    const compte = await db.utilisateur.findUnique({ where: { email } });
    // Même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
    if (!(await verifierMotDePasse(motDePasse, compte?.motDePasseHash)) || !compte) {
      compterTentative(cleCompte);
      if (cleAdresse) compterTentative(cleAdresse);
      return refus("Email ou mot de passe incorrect.", 401);
    }
    if (compte.suspendu) return refus("Ce compte est suspendu. Contactez le support KEUR BI.", 403);
    oublierTentatives(cleCompte);
    await ouvrirSession(compte.id);
    return NextResponse.json({ utilisateur: versSession(compte) });
  } catch (e) {
    console.error("POST /api/auth/connexion", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

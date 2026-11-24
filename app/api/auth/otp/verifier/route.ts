import { NextResponse } from "next/server";
import { memeOrigine, ouvrirSession, versSession } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { verifierCode } from "@/lib/serveur/otp";
import { lireJson } from "@/lib/serveur/securite";

const refus = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });

// POST /api/auth/otp/verifier  { defi, code } : code correct, la session s'ouvre.
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  const corps = await lireJson(requete);
  try {
    const r = await verifierCode(corps?.defi, corps?.code);
    if (!r.ok) return refus(r.erreur, r.status);
    await ouvrirSession(r.valeur.id);
    log.info("Connexion réussie (code WhatsApp)", { utilisateurId: r.valeur.id, role: r.valeur.role });
    return NextResponse.json({ utilisateur: versSession(r.valeur) });
  } catch (e) {
    log.erreur("POST /api/auth/otp/verifier", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const POST = avecJournal("POST /api/auth/otp/verifier", post);

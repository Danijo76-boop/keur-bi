import { NextResponse } from "next/server";
import { compteCourant, memeOrigine } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { creerProgramme, listerProgrammes } from "@/lib/serveur/programmes";
import { freiner, LIMITES, lireJson } from "@/lib/serveur/securite";

export const dynamic = "force-dynamic";

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// GET /api/programmes?region=Dakar : programmes neufs publiés.
async function get(requete: Request) {
  try {
    const programmes = await listerProgrammes(new URL(requete.url).searchParams.get("region") ?? undefined);
    return NextResponse.json({ programmes });
  } catch (e) {
    log.erreur("GET /api/programmes", e);
    return refus("La base de données ne répond pas.", 503);
  }
}

// POST /api/programmes : publication d'un programme neuf par une agence ou un administrateur.
async function post(requete: Request) {
  if (!memeOrigine()) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    if (await freiner(`publication:${moi.id}`, LIMITES.publication)) return refus("Trop de publications aujourd'hui. Réessayez demain.", 429);
    const corps = await lireJson(requete, 200_000);
    if (!corps) return refus("Demande incomplète.", 400);
    const resultat = await creerProgramme(moi, corps);
    if (!resultat.ok) {
      log.info("Programme refusé", { raison: resultat.erreur });
      return refus(resultat.erreur, resultat.status);
    }
    log.info("Programme neuf publié", { programmeId: resultat.programme.id, lots: resultat.programme.lots.length });
    return NextResponse.json({ programme: resultat.programme }, { status: 201 });
  } catch (e) {
    log.erreur("POST /api/programmes", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const GET = avecJournal("GET /api/programmes", get);
export const POST = avecJournal("POST /api/programmes", post);

import { NextResponse } from "next/server";
import { compteCourant, memeOrigine } from "@/lib/serveur/auth";
import { creerAlerte, listerAlertes } from "@/lib/serveur/alertes";
import { avecJournal, log } from "@/lib/serveur/journal";
import { freiner, LIMITES, lireJson } from "@/lib/serveur/securite";

export const dynamic = "force-dynamic";

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// GET /api/alertes : les alertes de la personne connectée.
async function get() {
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    return NextResponse.json({ alertes: await listerAlertes(moi) });
  } catch (e) {
    log.erreur("GET /api/alertes", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

// POST /api/alertes  { nom, criteres, frequence } : enregistre une recherche, envoyée par email quand de nouvelles annonces correspondent.
async function post(requete: Request) {
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    if (await freiner(`alerte:${moi.id}`, LIMITES.alerte)) return refus("Trop d'alertes créées en peu de temps. Réessayez plus tard.", 429);
    const corps = await lireJson(requete, 5_000);
    if (!corps) return refus("Demande incomplète.", 400);
    const r = await creerAlerte(moi, corps);
    if (!r.ok) return refus(r.erreur, 400);
    log.info("Alerte créée", { alerteId: r.alerte.id, frequence: r.alerte.frequence });
    return NextResponse.json({ alerte: r.alerte }, { status: 201 });
  } catch (e) {
    log.erreur("POST /api/alertes", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const GET = avecJournal("GET /api/alertes", get);
export const POST = avecJournal("POST /api/alertes", post);

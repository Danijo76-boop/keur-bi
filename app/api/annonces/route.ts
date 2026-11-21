import { NextResponse } from "next/server";
import { creerAnnonce, listerAnnonces } from "@/lib/serveur/annonces";
import { compteCourant, memeOrigine } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { freiner, LIMITES, lireJson } from "@/lib/serveur/securite";

// La liste dépend de la base, des filtres de l'adresse et de la personne connectée : elle est calculée à chaque appel.
export const dynamic = "force-dynamic";

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// GET /api/annonces?region=Dakar&type=villa&prixMax=100000000&q=almadies
// Une personne connectée voit en plus ses propres annonces retirées ; la modération les voit toutes.
async function get(requete: Request) {
  const p = new URL(requete.url).searchParams;
  const nombre = (cle: string) => {
    const v = Number(p.get(cle));
    return p.get(cle) && Number.isFinite(v) && v >= 0 ? v : undefined;
  };
  try {
    const annonces = await listerAnnonces(
      {
        q: p.get("q")?.trim() || undefined,
        type: p.get("type") ?? undefined,
        region: p.get("region") ?? undefined,
        quartier: p.get("quartier") ?? undefined,
        prixMin: nombre("prixMin"),
        prixMax: nombre("prixMax"),
      },
      await compteCourant(),
    );
    return NextResponse.json({ total: annonces.length, annonces });
  } catch (e) {
    log.erreur("GET /api/annonces", e);
    return refus("La base de données ne répond pas.", 503);
  }
}

// POST /api/annonces : publication d'une annonce par un vendeur connecté.
async function post(requete: Request) {
  if (!memeOrigine()) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    if (await freiner(`publication:${moi.id}`, LIMITES.publication)) return refus("Trop de publications aujourd'hui. Réessayez demain.", 429);
    const corps = await lireJson(requete);
    if (!corps || typeof corps !== "object") return refus("Demande incomplète.", 400);
    const resultat = await creerAnnonce(moi, corps as Record<string, unknown>);
    if (!resultat.ok) {
      log.info("Publication refusée", { raison: resultat.erreur });
      return refus(resultat.erreur, resultat.status);
    }
    log.info("Annonce publiée", { annonceId: resultat.annonce.id, reference: resultat.annonce.reference });
    return NextResponse.json({ annonce: resultat.annonce }, { status: 201 });
  } catch (e) {
    log.erreur("POST /api/annonces", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const GET = avecJournal("GET /api/annonces", get);
export const POST = avecJournal("POST /api/annonces", post);

import { NextResponse } from "next/server";
import { modifierAnnonce, trouverAnnonce } from "@/lib/serveur/annonces";
import { compteCourant, memeOrigine } from "@/lib/serveur/auth";
import { avecJournal, log } from "@/lib/serveur/journal";
import { lireJson } from "@/lib/serveur/securite";

export const dynamic = "force-dynamic";

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// GET /api/annonces/1
async function get(_requete: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  try {
    const annonce = await trouverAnnonce(params.id, await compteCourant());
    if (!annonce) return refus("Annonce introuvable.", 404);
    return NextResponse.json(annonce);
  } catch (e) {
    log.erreur("GET /api/annonces/[id]", e);
    return refus("La base de données ne répond pas.", 503);
  }
}

// PATCH /api/annonces/1  { titre?, description?, prix?, depublie?, boost? }
async function patch(requete: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  if (!(await memeOrigine())) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    const corps = await lireJson(requete);
    if (!corps || typeof corps !== "object") return refus("Demande incomplète.", 400);
    const resultat = await modifierAnnonce(moi, params.id, corps as Record<string, unknown>);
    if (!resultat.ok) {
      log.info("Modification d'annonce refusée", { annonceId: params.id, raison: resultat.erreur });
      return refus(resultat.erreur, resultat.status);
    }
    if ("depublie" in corps && moi.role !== "vendeur" && moi.role !== "agence" && moi.role !== "agent")
      log.audit("Annonce retirée ou remise en ligne par l'équipe", { annonceId: params.id, depublie: corps.depublie, par: moi.role });
    else log.info("Annonce modifiée", { annonceId: params.id, champs: Object.keys(corps) });
    return NextResponse.json({ annonce: resultat.annonce });
  } catch (e) {
    log.erreur("PATCH /api/annonces/[id]", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

export const GET = avecJournal("GET /api/annonces/[id]", get);
export const PATCH = avecJournal("PATCH /api/annonces/[id]", patch);

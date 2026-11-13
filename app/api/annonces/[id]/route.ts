import { NextResponse } from "next/server";
import { modifierAnnonce, trouverAnnonce } from "@/lib/serveur/annonces";
import { compteCourant, memeOrigine } from "@/lib/serveur/auth";

export const dynamic = "force-dynamic";

const refus = (erreur: string, status: number) => NextResponse.json({ erreur }, { status });

// GET /api/annonces/1
export async function GET(_requete: Request, { params }: { params: { id: string } }) {
  try {
    const annonce = await trouverAnnonce(params.id, await compteCourant());
    if (!annonce) return refus("Annonce introuvable.", 404);
    return NextResponse.json(annonce);
  } catch (e) {
    console.error("GET /api/annonces/[id]", e);
    return refus("La base de données ne répond pas.", 503);
  }
}

// PATCH /api/annonces/1  { titre?, description?, prix?, depublie?, boost? }
export async function PATCH(requete: Request, { params }: { params: { id: string } }) {
  if (!memeOrigine()) return refus("Requête refusée.", 403);
  try {
    const moi = await compteCourant();
    if (!moi) return refus("Connexion requise.", 401);
    const corps = await requete.json().catch(() => null);
    if (!corps || typeof corps !== "object") return refus("Demande incomplète.", 400);
    const resultat = await modifierAnnonce(moi, params.id, corps as Record<string, unknown>);
    if (!resultat.ok) return refus(resultat.erreur, resultat.status);
    return NextResponse.json({ annonce: resultat.annonce });
  } catch (e) {
    console.error("PATCH /api/annonces/[id]", e);
    return refus("Le service est momentanément indisponible.", 503);
  }
}

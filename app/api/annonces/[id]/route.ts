import { NextResponse } from "next/server";
import { trouverAnnonce } from "@/lib/serveur/annonces";

export const dynamic = "force-dynamic";

// GET /api/annonces/1
export async function GET(_requete: Request, { params }: { params: { id: string } }) {
  try {
    const annonce = await trouverAnnonce(params.id);
    if (!annonce) return NextResponse.json({ erreur: "Annonce introuvable." }, { status: 404 });
    return NextResponse.json(annonce);
  } catch (e) {
    console.error("GET /api/annonces/[id]", e);
    return NextResponse.json({ erreur: "La base de données ne répond pas." }, { status: 503 });
  }
}
